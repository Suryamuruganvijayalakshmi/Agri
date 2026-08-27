-- ============================================================
-- AGRIFLOW - REAL-TIME FARMER POSITION BOOKING SYSTEM
-- Complete Supabase PostgreSQL Database Schema, Triggers, RPCs & RLS
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Helper trigger function for updating updated_at timestamp
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- 2. TABLES DEFINITIONS
-- ============================================================

-- Procurement Centres Table
create table if not exists procurement_centres (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  latitude numeric not null,
  longitude numeric not null,
  address text,
  district text not null default 'Mandya',
  state text not null default 'Karnataka',
  status text not null default 'OPEN', -- OPEN, HIGH_LOAD, FULL, CLOSED
  daily_capacity_kg numeric not null default 50000,
  booked_capacity_kg numeric not null default 0,
  active_counters integer not null default 4,
  avg_processing_minutes integer not null default 15,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Farmers Table
create table if not exists farmers (
  id uuid primary key default gen_random_uuid(),
  farmer_code text not null unique,
  name text not null,
  phone text,
  district text default 'Mandya',
  landholding_acres numeric default 4.5,
  primary_crop text default 'Paddy (Sona Masoori)',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Slots Table (Keeping existing required schema)
create table if not exists slots (
  id uuid primary key default gen_random_uuid(),
  centre_id uuid not null references procurement_centres(id) on delete cascade,
  slot_date date not null default current_date,
  start_time text not null,
  end_time text not null,
  maximum_bookings integer not null default 20,
  current_bookings integer not null default 0,
  is_available boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Appointments Table
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  booking_id text not null unique,
  token_number text not null,
  qr_token text not null,
  farmer_id uuid references farmers(id) on delete set null,
  farmer_name text,
  centre_id uuid not null references procurement_centres(id) on delete cascade,
  slot_id uuid not null references slots(id) on delete cascade,
  position_number integer not null,
  crop_type text not null,
  declared_quantity_kg numeric not null,
  status text not null default 'BOOKED', -- BOOKED, IN_TRANSIT, WEIGHED, APPROVED, PAID, CANCELLED
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Crops Table (Farmer product management & crop proposals)
create table if not exists crops (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null default 'Grain',
  package_weight_kg numeric not null default 50,
  msp_price_per_kg numeric not null default 22,
  moisture_threshold_percent numeric not null default 14,
  status text not null default 'APPROVED', -- APPROVED, PENDING, REJECTED
  proposed_by uuid references farmers(id) on delete set null,
  created_at timestamptz default now()
);

-- Weighments Table
create table if not exists weighments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments(id) on delete cascade,
  declared_quantity_kg numeric not null,
  measured_quantity_kg numeric not null,
  difference_kg numeric not null,
  machine_id text default 'WEIGHBRIDGE-01',
  operator_name text default 'Yard Weighmaster',
  created_at timestamptz default now()
);

-- Quality Inspections Table
create table if not exists quality_inspections (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments(id) on delete cascade,
  moisture_percent numeric not null,
  foreign_matter_percent numeric default 0.5,
  damaged_percent numeric default 0.2,
  grade text not null default 'Grade A',
  remarks text,
  status text not null default 'ACCEPTED', -- ACCEPTED, REJECTED, RECHECK
  inspector_name text default 'Senior Quality Inspector',
  created_at timestamptz default now()
);

-- Audit Logs Table
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_role text default 'SYSTEM',
  user_name text default 'System Operator',
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb,
  created_at timestamptz default now()
);


-- ============================================================
-- 3. INDEXES
-- ============================================================

create index if not exists idx_slot_positions_slot on slot_positions(slot_id);
create index if not exists idx_slot_positions_status on slot_positions(status);
create index if not exists idx_slot_positions_appointment on slot_positions(appointment_id);
create index if not exists idx_slot_positions_farmer on slot_positions(booked_by);

create index if not exists idx_slots_centre_date on slots(centre_id, slot_date);
create index if not exists idx_appointments_farmer on appointments(farmer_id);
create index if not exists idx_appointments_booking_id on appointments(booking_id);

-- ============================================================
-- 4. TRIGGERS & AUTOMATIC POSITION GENERATION
-- ============================================================

-- Updated_at triggers
drop trigger if exists set_slot_positions_updated_at on slot_positions;
create trigger set_slot_positions_updated_at
  before update on slot_positions
  for each row execute function set_updated_at();

drop trigger if exists set_slots_updated_at on slots;
create trigger set_slots_updated_at
  before update on slots
  for each row execute function set_updated_at();

drop trigger if exists set_appointments_updated_at on appointments;
create trigger set_appointments_updated_at
  before update on appointments
  for each row execute function set_updated_at();

-- PostgreSQL Function: Automatically generate slot_positions when a slot is created
create or replace function generate_slot_positions()
returns trigger as $$
declare
  i integer;
begin
  for i in 1..new.maximum_bookings loop
    insert into slot_positions (slot_id, position_number, status, created_at, updated_at)
    values (new.id, i, 'AVAILABLE', now(), now())
    on conflict (slot_id, position_number) do nothing;
  end loop;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_generate_slot_positions on slots;
create trigger trigger_generate_slot_positions
  after insert on slots
  for each row execute function generate_slot_positions();


-- ============================================================
-- 5. ATOMIC DATABASE RPC FUNCTIONS
-- ============================================================

-- Atomic Position Booking RPC
create or replace function book_appointment_position(
  p_farmer_id uuid,
  p_slot_id uuid,
  p_crop_id text,
  p_declared_quantity_kg numeric,
  p_position_id uuid
) returns jsonb as $$
declare
  v_pos record;
  v_slot record;
  v_farmer record;
  v_appointment_id uuid;
  v_booking_id text;
  v_token_number text;
  v_qr_token text;
  v_centre_id uuid;
  v_seq integer;
begin
  -- 1. Lock and verify selected slot position
  select * into v_pos from slot_positions where id = p_position_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Selected position does not exist.');
  end if;

  if v_pos.status <> 'AVAILABLE' then
    return jsonb_build_object('success', false, 'error', 'Position already booked. Please select another position.');
  end if;

  if v_pos.slot_id <> p_slot_id then
    return jsonb_build_object('success', false, 'error', 'Position mismatch for selected slot.');
  end if;

  -- 2. Lock and verify slot capacity
  select * into v_slot from slots where id = p_slot_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Selected slot does not exist.');
  end if;

  if not v_slot.is_available or v_slot.current_bookings >= v_slot.maximum_bookings then
    return jsonb_build_object('success', false, 'error', 'Slot capacity reached.');
  end if;

  v_centre_id := v_slot.centre_id;

  -- Fetch farmer name if available
  select name into v_farmer from farmers where id = p_farmer_id;

  -- 3. Generate Secure References (No PII in QR token)
  v_appointment_id := gen_random_uuid();
  v_seq := v_slot.current_bookings + 1;
  v_booking_id := 'AGR-2026-' || lpad(floor(random() * 89999 + 10000)::text, 5, '0');
  v_token_number := 'T-' || lpad(v_pos.position_number::text, 2, '0') || '-' || lpad(v_seq::text, 3, '0');
  v_qr_token := md5(v_appointment_id::text || clock_timestamp()::text);

  -- 4. Create Appointment Record
  insert into appointments (
    id,
    booking_id,
    token_number,
    qr_token,
    farmer_id,
    farmer_name,
    centre_id,
    slot_id,
    position_number,
    crop_type,
    declared_quantity_kg,
    status,
    created_at,
    updated_at
  ) values (
    v_appointment_id,
    v_booking_id,
    v_token_number,
    v_qr_token,
    p_farmer_id,
    coalesce(v_farmer.name, 'Ramesh Gowda'),
    v_centre_id,
    p_slot_id,
    v_pos.position_number,
    p_crop_id,
    p_declared_quantity_kg,
    'BOOKED',
    now(),
    now()
  );

  -- 5. Update slot_positions to BOOKED
  update slot_positions set
    status = 'BOOKED',
    appointment_id = v_appointment_id,
    booked_by = p_farmer_id,
    booked_at = now(),
    updated_at = now()
  where id = p_position_id;

  -- 6. Synchronize slots.current_bookings and slots.is_available
  update slots set
    current_bookings = current_bookings + 1,
    is_available = (current_bookings + 1 < maximum_bookings),
    updated_at = now()
  where id = p_slot_id;

  -- 7. Update procurement centre booked_capacity_kg
  update procurement_centres set
    booked_capacity_kg = booked_capacity_kg + p_declared_quantity_kg,
    updated_at = now()
  where id = v_centre_id;

  return jsonb_build_object(
    'success', true,
    'appointment', jsonb_build_object(
      'id', v_appointment_id,
      'booking_id', v_booking_id,
      'token_number', v_token_number,
      'qr_token', v_qr_token,
      'position_number', v_pos.position_number,
      'centre_id', v_centre_id,
      'slot_id', p_slot_id,
      'crop_type', p_crop_id,
      'declared_quantity_kg', p_declared_quantity_kg,
      'status', 'BOOKED',
      'created_at', now()
    )
  );
exception
  when others then
    return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$ language plpgsql security definer;


-- Atomic Appointment Cancellation RPC
create or replace function cancel_appointment(
  p_appointment_id uuid
) returns jsonb as $$
declare
  v_app record;
  v_slot_id uuid;
  v_centre_id uuid;
  v_qty numeric;
begin
  select * into v_app from appointments where id = p_appointment_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Appointment not found.');
  end if;

  if v_app.status = 'CANCELLED' then
    return jsonb_build_object('success', false, 'error', 'Appointment is already cancelled.');
  end if;

  v_slot_id := v_app.slot_id;
  v_centre_id := v_app.centre_id;
  v_qty := v_app.declared_quantity_kg;

  -- 1. Mark appointment as CANCELLED
  update appointments set
    status = 'CANCELLED',
    updated_at = now()
  where id = p_appointment_id;

  -- 2. Release slot_positions record back to AVAILABLE
  update slot_positions set
    status = 'AVAILABLE',
    appointment_id = null,
    booked_by = null,
    booked_at = null,
    updated_at = now()
  where appointment_id = p_appointment_id;

  -- 3. Decrease slots.current_bookings and mark available
  if v_slot_id is not null then
    update slots set
      current_bookings = greatest(0, current_bookings - 1),
      is_available = true,
      updated_at = now()
    where id = v_slot_id;
  end if;

  -- 4. Decrease centre booked_capacity_kg
  if v_centre_id is not null then
    update procurement_centres set
      booked_capacity_kg = greatest(0, booked_capacity_kg - v_qty),
      updated_at = now()
    where id = v_centre_id;
  end if;

  return jsonb_build_object('success', true, 'message', 'Appointment cancelled and position released to AVAILABLE.');
exception
  when others then
    return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$ language plpgsql security definer;


-- ============================================================
-- 6. SECURITY & RLS POLICIES
-- ============================================================

alter table procurement_centres enable row level security;
alter table farmers enable row level security;
alter table slots enable row level security;
alter table appointments enable row level security;
alter table slot_positions enable row level security;

-- Public/Anon read policies (Farmers & Operators can view positions & slots)
create policy "Allow read procurement_centres" on procurement_centres for select using (true);
create policy "Allow read farmers" on farmers for select using (true);
create policy "Allow read slots" on slots for select using (true);
create policy "Allow read appointments" on appointments for select using (true);
create policy "Allow read slot_positions" on slot_positions for select using (true);

-- Direct frontend updates/deletes on slot_positions are disabled via RLS.
-- (Modifications MUST happen via RPC book_appointment_position and cancel_appointment)


-- ============================================================
-- 7. SUPABASE REALTIME CONFIGURATION
-- ============================================================

alter table slot_positions replica identity full;
alter table slots replica identity full;
alter table appointments replica identity full;

-- Add tables to realtime publication
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table slot_positions, slots, appointments, procurement_centres;
commit;


-- ============================================================
-- 8. SAMPLE SEED DATA
-- ============================================================

do $$
declare
  v_centre_1 uuid := 'a1b2c3d4-e5f6-7890-abcd-111111111111'::uuid;
  v_centre_2 uuid := 'a1b2c3d4-e5f6-7890-abcd-222222222222'::uuid;
  v_farmer_1 uuid := 'f1f2f3f4-e5f6-7890-abcd-999999999999'::uuid;
  v_slot_1 uuid := 's1s2s3s4-e5f6-7890-abcd-000000000830'::uuid;
  v_slot_2 uuid := 's1s2s3s4-e5f6-7890-abcd-000000001000'::uuid;
  v_slot_3 uuid := 's1s2s3s4-e5f6-7890-abcd-000000001030'::uuid;
  i integer;
begin
  -- Seed Centre
  insert into procurement_centres (id, code, name, latitude, longitude, address, district, state, status, daily_capacity_kg, booked_capacity_kg)
  values 
    (v_centre_1, 'PROC-KA-01', 'Mandya Central Procurement Yard', 12.5224, 76.8974, 'APMC Market Yard, NH 275, Mandya, Karnataka', 'Mandya', 'Karnataka', 'OPEN', 50000, 31000),
    (v_centre_2, 'PROC-KA-02', 'Maddur Grain Storage & Procurement Centre', 12.5843, 77.0452, 'Old Bazaar Street, Maddur, Karnataka', 'Mandya', 'Karnataka', 'HIGH_LOAD', 40000, 33600)
  on conflict (code) do nothing;

  -- Seed Farmer
  insert into farmers (id, farmer_code, name, phone, district, landholding_acres, primary_crop)
  values (v_farmer_1, 'F-1042', 'Ramesh Gowda', '+91 98450 12345', 'Mandya', 4.5, 'Paddy (Sona Masoori)')
  on conflict (farmer_code) do nothing;

  -- Seed Slots
  insert into slots (id, centre_id, slot_date, start_time, end_time, maximum_bookings, current_bookings, is_available)
  values
    (v_slot_1, v_centre_1, current_date, '08:30 AM', '09:00 AM', 20, 8, true),
    (v_slot_2, v_centre_1, current_date, '10:00 AM', '10:30 AM', 20, 13, true),
    (v_slot_3, v_centre_1, current_date, '10:30 AM', '11:00 AM', 20, 19, true)
  on conflict (id) do nothing;

  -- Pre-book positions for slot 2 (13 booked, 7 available) to match prompt requirements
  update slot_positions set status = 'BOOKED', booked_at = now()
  where slot_id = v_slot_2 and position_number in (2, 3, 5, 8, 9, 10, 12, 13, 14, 15, 17, 18, 19);

end;
$$;
