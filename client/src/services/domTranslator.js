// AGRIFlow Dynamic DOM Auto-Translator Engine
// Automatically scans and translates every visible text node across all pages,
// modals, tabs, tables, and dynamically loaded content into Hindi, Kannada, Tamil, or Telugu.

import { translations } from '../i18n/translations';

// Common vocabulary dictionary across all dashboards, pages, and components
export const phraseDictionary = {
  // Navigation & Headers
  "AGRIFlow": { hi: "एग्रीफ्लो", kn: "ಅಗ್ರಿಫ್ಲೋ", ta: "அக்ரிஃப்ளோ", te: "అగ్రిఫ్లో" },
  "Dashboard": { hi: "डैशबोर्ड", kn: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", ta: "டாஷ்போர்டு", te: "డాష్‌బోర్డ్" },
  "My Farm & Land": { hi: "मेरा खेत और भूमि", kn: "ನನ್ನ ಜಮೀನು ಮತ್ತು ಕೃಷಿಭೂಮಿ", ta: "என் பண்ணை & நிலம்", te: "నా పొలం & భూమి" },
  "Procurement Centres": { hi: "खरीद केंद्र", kn: "ಖರೀದಿ ಕೇಂದ್ರಗಳು", ta: "கொள்முதல் நிலையங்கள்", te: "కొనుగోలు కేంద్రాలు" },
  "Facilities Map": { hi: "सुविधा मानचित्र", kn: "ಕೇಂದ್ರಗಳ ನಕ್ಷೆ", ta: "வசதிகள் வரைபடம்", te: "సౌకర్యాల మ్యాప్" },
  "Book Slot": { hi: "स्लॉट बुक करें", kn: "ಸ್ಲಾಟ್ ಕಾಯ್ದಿರಿಸಿ", ta: "நேர स्लாட் முன்பதிவு", te: "స్లాట్ బుక్ చేయండి" },
  "Live Yard Queue": { hi: "लाइव यार्ड कतार", kn: "ಲೈವ್ ಯಾರ್ಡ್ ಸರದಿ", ta: "நேரலை வரிசை", te: "లైవ్ యార్డ్ క్యూ" },
  "Journey Timeline": { hi: "प्रक्रिया समयरेखा", kn: "ಪ್ರಕ್ರಿಯೆ ಕಾಲಾವಧಿ", ta: "பயண காலவரிசை", te: "ప్రయాణ కాలక్రమం" },
  "DBT Payment Tracker": { hi: "डीबीटी भुगतान ट्रैकर", kn: "ಡಿಬಿಟಿ ಪಾವತಿ ಟ್ರ್ಯಾಕರ್", ta: "டிபிடி கொடுப்பனவு கண்காணிப்பு", te: "DBT చెల్లింపు ట్రాకర్" },
  "Notifications": { hi: "सूचनाएं", kn: "ಸೂಚನೆಗಳು", ta: "அறிவிப்புகள்", te: "నోటిఫికేషన్లు" },
  "Operator Console": { hi: "ऑपरेटर कंसोल", kn: "ಆಪರೇಟರ್ ಕನ್ಸೋಲ್", ta: "ஆபரேட்டர் கன்சோல்", te: "ఆపరేటర్ కన్సోల్" },
  "Performance Analytics": { hi: "प्रदर्शन विश्लेषण", kn: "ಕಾರ್ಯಕ್ಷಮತೆ ವಿಶ್ಲೇಷಣೆ", ta: "செயல்திறன் பகுப்பாய்வு", te: "పనితీరు విశ్లేషణ" },
  "Payment Statements": { hi: "भुगतान विवरण", kn: "ಪಾವತಿ ವಿವರ ಪಟ್ಟಿ", ta: "கொடுப்பனவு அறிக்கைகள்", te: "చెల్లింపు నివేదికలు" },
  "AI Crop Intelligence": { hi: "एआई फसल बुद्धिमत्ता", kn: "ಎಐ ಬೆಳೆ ಬುದ್ಧಿಮತ್ತೆ", ta: "AI பயிர் நுண்ணறிவு", te: "AI పంట సమాచారం" },
  "District Nodal Overview": { hi: "जिला नोडल अवलोकन", kn: "ಜಿಲ್ಲಾ ನೋಡಲ್ ಅವಲೋಕನ", ta: "மாவட்ட நோடல் மேலோட்டம்", te: "జిల్లా నోడల్ అవలోకనం" },
  "Quality Lab": { hi: "गुणवत्ता प्रयोगशाला", kn: "ಗುಣಮಟ್ಟ ಪರೀಕ್ಷಾ ಪ್ರಯೋಗಾಲಯ", ta: "தர ஆய்வகம்", te: "నాణ్యత ప్రయోగశాల" },
  "Weighbridge": { hi: "धर्मकांटा (वेब्रिज)", kn: "ತೂಕದ ಸೇತುವೆ (ವೇಬ್ರಿಡ್ಜ್)", ta: "எடை மேடை", te: "వేబ్రిడ్జి" },

  // Roles & Logins
  "Farmer Portal": { hi: "किसान पोर्टल", kn: "ರೈತ ಪೋರ್ಟಲ್", ta: "விவசாயி தளம்", te: "రైతు పోర్టల్" },
  "Centre Operator": { hi: "केंद्र संचालक", kn: "ಕೇಂದ್ರ ಆಪರೇಟರ್", ta: "மைய ஆபரேட்டர்", te: "కేంద్ర నిర్వాహకుడు" },
  "Government Command Centre": { hi: "सरकारी कमान केंद्र", kn: "ಸರ್ಕಾರಿ ಕಮಾಂಡ್ ಸೆಂಟರ್", ta: "அரசு கட்டளை மையம்", te: "ప్రభుత్వ కమాండ్ సెంటర్" },
  "Quality Inspector": { hi: "गुणवत्ता निरीक्षक", kn: "ಗುಣಮಟ್ಟ ಪರಿವೀಕ್ಷಕ", ta: "தர ஆய்வாளர்", te: "నాణ్యత ఇన్స్పెక్టర్" },
  "Farmer Login": { hi: "किसान लॉगिन", kn: "ರೈತರ ಲಾಗಿನ್", ta: "விவசாயி உள்நுழைவு", te: "రైతు లాగిన్" },
  "Officer Login": { hi: "अधिकारी लॉगिन", kn: "ಅಧಿಕಾರಿ ಲಾಗಿನ್", ta: "அதிகாரி உள்நுழைவு", te: "అధికారి లాగిన్" },
  "Sign In": { hi: "साइन इन करें", kn: "ಸೈನ್ ಇನ್", ta: "உள்நுழைக", te: "సైన్ ఇన్" },
  "Sign Out": { hi: "लॉग आउट", kn: "ಲಾಗ್ ಔಟ್", ta: "வெளியேறு", te: "లాగ్ అవుట్" },
  "Sign In to Farmer Portal": { hi: "किसान पोर्टल में लॉगिन करें", kn: "ರೈತ ಪೋರ್ಟಲ್‌ಗೆ ಸೈನ್ ಇನ್ ಮಾಡಿ", ta: "விவசாயி தளத்தில் நுழையவும்", te: "రైతు పోర్టల్‌లోకి సైన్ ఇన్ చేయండి" },
  "Sign In to Officer Console": { hi: "अधिकारी कंसोल में लॉगिन करें", kn: "ಅಧಿಕಾರಿ ಕನ್ಸೋಲ್‌ಗೆ ಸೈನ್ ಇನ್ ಮಾಡಿ", ta: "அதிகாரி கன்சோலில் நுழையவும்", te: "అధికారి కన్సోల్‌లోకి సైన్ ఇన్ చేయండి" },
  "Return to Login": { hi: "लॉगिन पर वापस जाएं", kn: "ಲಾಗಿನ್‌ಗೆ ಹಿಂತಿರುಗಿ", ta: "உள்நுழைவுக்குத் திரும்பு", te: "లాగిన్‌కి తిరిగి వెళ్లండి" },
  "Register New Farmer Profile": { hi: "नया किसान प्रोफाइल पंजीकृत करें", kn: "ಹೊಸ ರೈತರ ಪ್ರೊಫೈಲ್ ನೋಂದಾಯಿಸಿ", ta: "புதிய விவசாயி சுயவிவரத்தைப் பதிவுசெய்க", te: "కొత్త రైతు ప్రొఫైల్‌ను నమోదు చేయండి" },
  "Don't have a farmer account?": { hi: "क्या आपके पास किसान खाता नहीं है?", kn: "ರೈತರ ಖಾತೆ ಇಲ್ಲವೇ?", ta: "விவசாயி கணக்கு இல்லையா?", te: "రైతు ఖాతా లేదా?" },

  // Buttons & Actions
  "Book Appointment": { hi: "अपॉइंटमेंट बुक करें", kn: "ನೇಮಕಾತಿ ಕಾಯ್ದಿರಿಸಿ", ta: "முன்பதிவு செய்க", te: "అపాయింట్‌మెంట్ బుక్ చేయండి" },
  "Book Capacity Slot": { hi: "क्षमता स्लॉट बुक करें", kn: "ಸಾಮರ್ಥ್ಯ ಸ್ಲಾಟ್ ಕಾಯ್ದಿರಿಸಿ", ta: "கொள்ளளவு ஸ்லாட் பதிவு", te: "సామర్థ్య స్లాట్ బుక్ చేయండి" },
  "Reserve Capacity Slot": { hi: "स्लॉट आरक्षित करें", kn: "ಸ್ಲಾಟ್ ಕಾಯ್ದಿರಿಸಿಕೊಳ್ಳಿ", ta: "ஸ்லாட் முன்பதிவு செய்க", te: "స్లాట్‌ను రిజర్వ్ చేసుకోండి" },
  "Check In Farmer": { hi: "किसान चेक-इन करें", kn: "ರೈತರ ಚೆಕ್-ಇನ್ ಮಾಡಿ", ta: "விவசாயி செக்-இன்", te: "రైతు చెక్-ఇన్ చేయండి" },
  "Update Stage": { hi: "चरण अपडेट करें", kn: "ಹಂತವನ್ನು ನವೀಕರಿಸಿ", ta: "நிலையைப் புதுப்பிக்கவும்", te: "దశను అప్‌డేట్ చేయండి" },
  "Save Changes": { hi: "बदलाव सहेजें", kn: "ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಿ", ta: "மாற்றங்களைச் சேமிக்கவும்", te: "మార్పులను సేవ్ చేయండి" },
  "Cancel": { hi: "रद्द करें", kn: "ರದ್ದುಮಾಡಿ", ta: "ரத்து செய்", te: "రద్దు చేయండి" },
  "Confirm Sign Out": { hi: "साइन आउट की पुष्टि करें", kn: "ಲಾಗ್ ಔಟ್ ದೃಢೀಕರಿಸಿ", ta: "வெளியேறுவதை உறுதிப்படுத்துக", te: "లాగ్ అవుట్‌ను నిర్ధారించండి" },
  "Allow Push Notifications": { hi: "पुश सूचनाएं सक्षम करें", kn: "ಪುಶ್ ಅಧಿಸೂಚನೆಗಳನ್ನು ಅನುಮತಿಸಿ", ta: "புஷ் அறிவிப்புகளை அனுமதிக்கவும்", te: "పుష్ నోటిఫికేషన్‌లను అనుమతించండి" },
  "Enable Live Alerts": { hi: "लाइव अलर्ट चालू करें", kn: "ಲೈವ್ ಎಚ್ಚರಿಕೆಗಳನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ", ta: "நேரலை எச்சரிக்கைகளை இயக்கு", te: "లైవ్ అలర్ట్‌లను ప్రారంభించండి" },
  "View Details": { hi: "विवरण देखें", kn: "ವಿವರಗಳನ್ನು ವೀಕ್ಷಿಸಿ", ta: "விவரங்களைக் காண்க", te: "వివరాలను చూడండి" },
  "Download": { hi: "डाउनलोड करें", kn: "ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ", ta: "பதிவிறக்குக", te: "డౌన్‌లోడ్ చేయండి" },
  "Print Statement": { hi: "विवरण प्रिंट करें", kn: "ಸ್ಟೇಟ್‌ಮೆಂಟ್ ಪ್ರಿಂಟ್ ಮಾಡಿ", ta: "அறிக்கையை அச்சிடுக", te: "స్టేట్‌మెంట్‌ను ప్రింట్ చేయండి" },
  "Submit": { hi: "जमा करें", kn: "ಸಲ್ಲಿಸಿ", ta: "சமர்ப்பிக்கவும்", te: "సమర్పించండి" },
  "Close": { hi: "बंद करें", kn: "ಮುಚ್ಚಿ", ta: "மூடு", te: "మూసివేయండి" },

  // Statuses & Stages
  "Booked": { hi: "बुक किया गया", kn: "ಬುಕ್ ಮಾಡಲಾಗಿದೆ", ta: "முன்பதிவு செய்யப்பட்டது", te: "బుక్ చేయబడింది" },
  "In Queue": { hi: "कतार में", kn: "ಸರದಿಯಲ್ಲಿದೆ", ta: "வரிசையில்", te: "క్యూలో ఉంది" },
  "Called": { hi: "बुलाया गया", kn: "ಕರೆಯಲಾಗಿದೆ", ta: "அழைக்கப்பட்டது", te: "పిలువబడింది" },
  "Processing": { hi: "प्रक्रिया जारी है", kn: "ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿದೆ", ta: "செயலாக்கத்தில்", te: "ప్రాసెసింగ్ జరుగుతోంది" },
  "Weighing": { hi: "वजन हो रहा है", kn: "ತೂಕ ಮಾಡಲಾಗುತ್ತಿದೆ", ta: "எடை போடப்படுகிறது", te: "తూకం వేస్తున్నారు" },
  "Completed": { hi: "पूर्ण हुआ", kn: "ಪೂರ್ಣಗೊಂಡಿದೆ", ta: "நிறைவடைந்தது", te: "పూర్తయింది" },
  "PAID": { hi: "भुगतान हो गया (Paid)", kn: "ಪಾವತಿಸಲಾಗಿದೆ (Paid)", ta: "செலுத்தப்பட்டது (Paid)", te: "చెల్లించబడింది (Paid)" },
  "PENDING": { hi: "लंबित (Pending)", kn: "ಬಾಕಿ ಇದೆ (Pending)", ta: "நிலுவையில் உள்ளது", te: "పెండింగ్‌లో ఉంది" },
  "PROCESSING": { hi: "प्रक्रिया में (Processing)", kn: "ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿದೆ", ta: "செயலாக்கத்தில் உள்ளது", te: "ప్రాసెసింగ్‌లో ఉంది" },
  "APPROVED": { hi: "स्वीकृत (Approved)", kn: "ಅನುಮೋದಿಸಲಾಗಿದೆ", ta: "அங்கீகரிக்கப்பட்டது", te: "ఆమోదించబడింది" },
  "REJECTED": { hi: "अस्वीकृत (Rejected)", kn: "ತಿರಸ್ಕರಿಸಲಾಗಿದೆ", ta: "நிராகரிக்கப்பட்டது", te: "తిరస్కరించబడింది" },
  "AVAILABLE": { hi: "उपलब्ध (Available)", kn: "ಲಭ್ಯವಿದೆ", ta: "கிடைக்கக்கூடியது", te: "అందుబాటులో ఉంది" },
  "CLOSED": { hi: "बंद है (Closed)", kn: "ಮುಚ್ಚಲಾಗಿದೆ", ta: "மூடப்பட்டது", te: "మూసివేయబడింది" },
  "Active": { hi: "सक्रिय", kn: "ಸಕ್ರಿಯ", ta: "செயலில் உள்ளது", te: "యాక్టివ్‌గా ఉంది" },

  // Agricultural Details
  "Crop": { hi: "फसल", kn: "ಬೆಳೆ", ta: "பயிர்", te: "పంట" },
  "Crop Type": { hi: "फसल का प्रकार", kn: "ಬೆಳೆಯ ವಿಧ", ta: "பயிர் வகை", te: "పంట రకం" },
  "Paddy": { hi: "धान (धान्य)", kn: "ಭತ್ತ", ta: "நெல்", te: "వరి (వరి ధాన్యం)" },
  "Wheat": { hi: "गेहूं", kn: "ಗೋಧಿ", ta: "கோதுமை", te: "గోధుమ" },
  "Maize": { hi: "मक्का", kn: "ಮೆಕ್ಕೆಜೋಳ", ta: "மக்காச்சோளம்", te: "మొక్కజొన్న" },
  "Ragi": { hi: "रागी", kn: "ರಾಗಿ", ta: "கேழ்வரகு (ராகி)", te: "రాగులు" },
  "Quantity": { hi: "मात्रा", kn: "ಪ್ರಮಾಣ", ta: "அளவு", te: "పరిమాణం" },
  "Declared Quantity": { hi: "घोषित मात्रा", kn: "ಘೋಷಿಸಿದ ಪ್ರಮಾಣ", ta: "அறிவிக்கப்பட்ட அளவு", te: "ప్రకటించిన పరిమాణం" },
  "Gross Weight": { hi: "सकल वजन (Gross)", kn: "ಒಟ್ಟು ತೂಕ", ta: "மொத்த எடை", te: "స్థూల బరువు" },
  "Tare Weight": { hi: "खाली वाहन वजन (Tare)", kn: "ಖಾಲಿ ವಾಹನದ ತೂಕ", ta: "வாகன எடை", te: "వాహనం బరువు" },
  "Net Weight": { hi: "शुद्ध वजन (Net)", kn: "ನಿವ್ವಳ ತೂಕ", ta: "நிகர எடை", te: "నికర బరువు" },
  "Moisture": { hi: "नमी (Moisture)", kn: "ತೇವಾಂಶ", ta: "ஈரப்பதம்", te: "తేమ శాతం" },
  "MSP Rate": { hi: "एमएसपी दर (न्यूनतम समर्थन मूल्य)", kn: "ಎಂಎಸ್‌ಪಿ ದರ (ಕನಿಷ್ಠ ಬೆಂಬಲ ಬೆಲೆ)", ta: "MSP விலை", te: "కనీస మద్దతు ధర (MSP)" },
  "Total Payout": { hi: "कुल भुगतान राशि", kn: "ಒಟ್ಟು ಪಾವತಿ ಮೊತ್ತ", ta: "மொத்த தொகை", te: "మొత్తం చెల్లింపు" },
  "Vehicle Number": { hi: "वाहन संख्या", kn: "ವಾಹನ ಸಂಖ್ಯೆ", ta: "வாகன எண்", te: "వాహనం సంఖ్య" },
  "Token": { hi: "टोकन", kn: "ಟೋಕನ್", ta: "டோக்கன்", te: "టోకెన్" },
  "Your Token": { hi: "आपका टोकन", kn: "ನಿಮ್ಮ ಟೋಕನ್", ta: "உங்கள் டோக்கன்", te: "మీ టోకెన్" },

  // Geography & Facility
  "Procurement Centre": { hi: "खरीद केंद्र", kn: "ಖರೀದಿ ಕೇಂದ್ರ", ta: "கொள்முதல் மையம்", te: "కొనుగోలు కేంద్రం" },
  "District": { hi: "ज़िला", kn: "ಜಿಲ್ಲೆ", ta: "மாவட்டம்", te: "జిల్లా" },
  "Taluk": { hi: "तालुका / तहसील", kn: "ತಾಲೂಕು", ta: "வட்டம்", te: "తాలూకా" },
  "Village": { hi: "गाँव", kn: "ಗ್ರಾಮ", ta: "கிராமம்", te: "గ్రామం" },
  "State": { hi: "राज्य", kn: "ರಾಜ್ಯ", ta: "மாநிலம்", te: "రాష్ట్రం" },
  "Daily Capacity": { hi: "दैनिक क्षमता", kn: "ದೈನಂದಿನ ಸಾಮರ್ಥ್ಯ", ta: "தினசரி கொள்ளளவு", te: "రోజువారీ సామర్థ్యం" },
  "Remaining Capacity": { hi: "शेष क्षमता", kn: "ಉಳಿದ ಸಾಮರ್ಥ್ಯ", ta: "மீதமுள்ள கொள்ளளவு", te: "మిగిలిన సామర్థ్యం" },
  "Current Queue": { hi: "वर्तमान कतार", kn: "ಪ್ರಸ್ತುತ ಸರದಿ", ta: "தற்போதைய வரிசை", te: "ప్రస్తుత క్యూ" },
  "Estimated Wait": { hi: "अनुमानित प्रतीक्षा", kn: "ಅಂದಾಜು ಕಾಯುವ ಸಮಯ", ta: "தோராயமான காத்திருப்பு", te: "అంచనా వేసిన వేచి ఉండే సమయం" },
  "Next Available Slot": { hi: "अगला उपलब्ध स्लॉट", kn: "ಮುಂದಿನ ಲಭ್ಯವಿರುವ ಸ್ಲಾಟ್", ta: "அடுத்த ஸ்லாட்", te: "తదుపరి అందుబాటులో ఉన్న స్లాట్" },
  "Distance": { hi: "दूरी", kn: "ದೂರ", ta: "தொலைவு", te: "దూరం" },

  // General Dashboard Phrases
  "Welcome back": { hi: "वापसी पर स्वागत है", kn: "ಮರಳಿ ಸ್ವಾಗತ", ta: "மீண்டும் வருக", te: "తిరిగి స్వాగతం" },
  "Active Procurement Journey": { hi: "सक्रिय खरीद यात्रा", kn: "ಸಕ್ರಿಯ ಖರೀದಿ ಪ್ರಕ್ರಿಯೆ", ta: "செயலில் உள்ள கொள்முதல் பயணம்", te: "క్రియాశీల కొనుగోలు ప్రక్రియ" },
  "No Active Booking": { hi: "कोई सक्रिय बुकिंग नहीं है", kn: "ಯಾವುದೇ ಸಕ್ರಿಯ ಬುಕಿಂಗ್ ಇಲ್ಲ", ta: "செயலில் உள்ள முன்பதிவு இல்லை", te: "ఎలాంటి బుకింగ్ లేదు" },
  "Recent Procurement Records": { hi: "हाल के खरीद रिकॉर्ड", kn: "ಇತ್ತೀಚಿನ ಖರೀದಿ ದಾಖಲೆಗಳು", ta: "சமீபத்திய கொள்முதல் பதிவுகள்", te: "ఇటీవలి కొనుగోలు రికార్డులు" },
  "Status": { hi: "स्थिति", kn: "ಸ್ಥಿತಿ", ta: "நிலை", te: "స్థితి" },
  "Actions": { hi: "कार्रवाई", kn: "ಕ್ರಮಗಳು", ta: "செயல்கள்", te: "చర్యలు" },
  "Amount": { hi: "राशि", kn: "ಮೊತ್ತ", ta: "தொகை", te: "మొత్తం" },
  "Date": { hi: "तारीख", kn: "ದಿನಾಂಕ", ta: "தேதி", te: "తేదీ" },
  "Time": { hi: "समय", kn: "ಸಮಯ", ta: "நேரம்", te: "సమయం" },
  "Email Address": { hi: "ईमेल पता", kn: "ಇಮೇಲ್ ವಿಳಾಸ", ta: "மின்னஞ்சல் முகவரி", te: "ఈమెయిల్ చిరునామా" },
  "Password": { hi: "पासवर्ड", kn: "ಪಾಸ್‌ವರ್ಡ್", ta: "கடவுச்சொல்", te: "పాస్‌వర్డ్" },
  "Phone": { hi: "फ़ोन नंबर", kn: "ದೂರವಾಣಿ ಸಂಖ್ಯೆ", ta: "தொலைபேசி எண்", te: "ఫోన్ నంబర్" },
  "Full Name": { hi: "पूरा नाम", kn: "ಪೂರ್ಣ ಹೆಸರು", ta: "முழுப் பெயர்", te: "పూర్తి పేరు" },
  "Aadhaar Number": { hi: "आधार संख्या", kn: "ಆಧಾರ್ ಸಂಖ್ಯೆ", ta: "ஆதார் எண்", te: "ఆధార్ సంఖ్య" },
  "Bank Name": { hi: "बैंक का नाम", kn: "ಬ್ಯಾಂಕ್ ಹೆಸರು", ta: "வங்கி பெயர்", te: "బ్యాంక్ పేరు" },
  "Account Number": { hi: "खाता संख्या", kn: "ಖಾತೆ ಸಂಖ್ಯೆ", ta: "கணக்கு எண்", te: "ఖాతా సంఖ్య" },
  "IFSC Code": { hi: "आईएफएससी कोड", kn: "ಐಎಫ್‌ಎಸ್‌ಸಿ ಕೋಡ್", ta: "IFSC குறியீடு", te: "IFSC కోడ్" },
  "Land Area": { hi: "भूमि का क्षेत्रफल (एकड़)", kn: "ಭೂಮಿ ವಿಸ್ತೀರ್ಣ (ಎಕರೆ)", ta: "நிலப்பரப்பு (ஏக்கர்)", te: "భూమి విస్తీర్ణం (ఎకరాలు)" },

  // Decision & Guidance
  "Where should I go?": { hi: "मुझे कहाँ जाना चाहिए?", kn: "ನಾನು ಎಲ್ಲಿಗೆ ಹೋಗಬೇಕು?", ta: "நான் எங்கு செல்ல வேண்டும்?", te: "నేను ఎక్కడికి వెళ్ళాలి?" },
  "Can the centre handle my produce?": { hi: "क्या केंद्र मेरी उपज संभाल सकता है?", kn: "ಕೇಂದ್ರವು ನನ್ನ ಬೆಳೆಯನ್ನು ಸ್ವೀಕರಿಸಬಲ್ಲದೇ?", ta: "நிலையம் எனது விளைபொருளைக் கையாள முடியுமா?", te: "కేంద్రం నా పంటను తీసుకోగలదా?" },
  "When should I go?": { hi: "मुझे कब जाना चाहिए?", kn: "ನಾನು ಯಾವಾಗ ಹೋಗಬೇಕು?", ta: "நான் எப்போது செல்ல வேண்டும்?", te: "నేను ఎప్పుడు వెళ్ళాలి?" },
  "What is happening with my procurement?": { hi: "मेरी खरीद प्रक्रिया में क्या हो रहा है?", kn: "ನನ್ನ ಖರೀದಿಯಲ್ಲಿ ಏನಾಗುತ್ತಿದೆ?", ta: "எனது கொள்முதலில் என்ன நடக்கிறது?", te: "నా కొనుగోలులో ఏమి జరుగుతోంది?" },
  "When will I get paid?": { hi: "मुझे भुगतान कब मिलेगा?", kn: "ನನಗೆ ಪಾವತಿ ಯಾವಾಗ ಸಿಗುತ್ತದೆ?", ta: "எனக்கு எப்போது பணம் கிடைக்கும்?", te: "నాకు ఎప్పుడు డబ్బులు వస్తాయి?" },
  "Should I Go Now?": { hi: "क्या मुझे अभी जाना चाहिए?", kn: "ನಾನು ಈಗಲೇ ಹೋಗಬೇಕೆ?", ta: "நான் இப்போது செல்ல வேண்டுமா?", te: "నేను ఇప్పుడు వెళ్లాలా?" },
  "GO AHEAD": { hi: "आगे बढ़ें (हाँ, जाएं)", kn: "ಮುಂದೆ ಹೋಗಿ (ಹೋಗಬಹುದು)", ta: "செல்லலாம் (முன்னேறு)", te: "వెళ్ళవచ్చు (ముందుకు సాగండి)" },
  "WAIT / RESCHEDULE": { hi: "प्रतीक्षा करें / रीशेड्यूल करें", kn: "ಕಾಯಿರಿ / ಮರುಹೊಂದಿಸಿ", ta: "காத்திருங்கள் / நேரம் மாற்றவும்", te: "వేచి ఉండండి / రీషెడ్యూల్ చేయండి" },
  "Good Availability": { hi: "अच्छी उपलब्धता", kn: "ಉತ್ತಮ ಲಭ್ಯತೆ", ta: "நல்ல கிடைக்கும் தன்மை", te: "మంచి లభ్యత" },
  "Limited / Getting Busy": { hi: "सीमित / व्यस्त हो रहा है", kn: "ಸೀಮಿತ / ದಟ್ಟಣೆ ಹೆಚ್ಚುತ್ತಿದೆ", ta: "குறைவான இடம்", te: "పరిమితం / రద్దీ పెరుగుతోంది" },
  "Very High Load / Full": { hi: "अत्यधिक भार / पूर्ण", kn: "ಹೆಚ್ಚು ದಟ್ಟಣೆ / ಭರ್ತಿಯಾಗಿದೆ", ta: "அதிக சுமை / நிறைந்தது", te: "అధిక రద్దీ / పూర్తయింది" },
  "Centre Closed": { hi: "केंद्र बंद है", kn: "ಕೇಂದ್ರ ಮುಚ್ಚಲಾಗಿದೆ", ta: "நிலையம் மூடப்பட்டுள்ளது", te: "కేంద్రం మూసివేయబడింది" },
  "LIVE REALTIME": { hi: "लाइव रियल-टाइम", kn: "ಲೈವ್ ರಿಯಲ್-ಟೈಮ್", ta: "நேரலை", te: "లైవ్ రియల్-టైమ్" },
  "RECONNECTING": { hi: "पुनः कनेक्ट हो रहा है", kn: "ಮರುಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ", ta: "மீண்டும் இணைகிறது", te: "తిరిగి కనెక్ట్ అవుతోంది" },
  "UNIQUE SESSION": { hi: "सक्रिय सत्र", kn: "ವಿಶಿಷ್ಟ ಸೆಷನ್", ta: "தனிப்பட்ட அமர்வு", te: "ప్రత్యేక సెషన్" }
};

// Build sorted phrases (longest first to prevent partial word collision)
let sortedPhrases = null;

function getSortedPhrases() {
  if (!sortedPhrases) {
    sortedPhrases = Object.keys(phraseDictionary).sort((a, b) => b.length - a.length);
  }
  return sortedPhrases;
}

// Function to translate a single text string
export function translateText(text, targetLang) {
  if (!text || typeof text !== 'string' || !targetLang || targetLang === 'en') {
    return text;
  }

  const trimmed = text.trim();
  if (!trimmed) return text;

  // Direct exact match
  if (phraseDictionary[trimmed] && phraseDictionary[trimmed][targetLang]) {
    const translated = phraseDictionary[trimmed][targetLang];
    return text.replace(trimmed, translated);
  }

  // Exact match from translations.js
  if (translations.en && translations[targetLang]) {
    for (const key of Object.keys(translations.en)) {
      if (translations.en[key] === trimmed && translations[targetLang][key]) {
        return text.replace(trimmed, translations[targetLang][key]);
      }
    }
  }

  // Phrase substitution
  let result = text;
  const phrases = getSortedPhrases();
  for (const phrase of phrases) {
    if (result.includes(phrase)) {
      const repl = phraseDictionary[phrase][targetLang];
      if (repl) {
        result = result.split(phrase).join(repl);
      }
    }
  }

  return result;
}

let activeObserver = null;

// Traverse and translate all visible text nodes in the DOM
export function applyDomTranslations(targetLang) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const root = document.getElementById('root');
  if (!root) return;

  // Stop any previous observer to avoid loop during DOM walk
  if (activeObserver) {
    activeObserver.disconnect();
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node || !node.nodeValue) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        // Skip non-translatable tags
        const tag = parent.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'code', 'pre', 'svg'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest('.no-translate') || parent.classList.contains('no-translate')) {
          return NodeFilter.FILTER_REJECT;
        }

        const val = node.nodeValue.trim();
        if (!val || val.length === 0 || /^\d+([.,]\d+)?\s*(kg|₹|km|%|acres|hours|mins)?$/i.test(val)) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const nodesToUpdate = [];
  let currentNode;
  while ((currentNode = walker.nextNode())) {
    nodesToUpdate.push(currentNode);
  }

  // Update nodes
  for (const node of nodesToUpdate) {
    if (targetLang === 'en') {
      if (node.__agriflow_orig) {
        node.nodeValue = node.__agriflow_orig;
      }
    } else {
      if (!node.__agriflow_orig) {
        node.__agriflow_orig = node.nodeValue;
      }
      const source = node.__agriflow_orig;
      const translated = translateText(source, targetLang);
      if (translated !== node.nodeValue) {
        node.nodeValue = translated;
      }
    }
  }

  // Also translate input placeholders
  const inputs = root.querySelectorAll('input[placeholder], textarea[placeholder]');
  inputs.forEach(inp => {
    if (targetLang === 'en') {
      if (inp.__agriflow_orig_placeholder) {
        inp.placeholder = inp.__agriflow_orig_placeholder;
      }
    } else {
      if (!inp.__agriflow_orig_placeholder) {
        inp.__agriflow_orig_placeholder = inp.placeholder;
      }
      inp.placeholder = translateText(inp.__agriflow_orig_placeholder, targetLang);
    }
  });

  // Re-attach MutationObserver to auto-translate newly mounted DOM nodes
  if (targetLang !== 'en') {
    activeObserver = new MutationObserver(() => {
      // Debounce observer runs
      if (window.__agriflow_trans_timer) clearTimeout(window.__agriflow_trans_timer);
      window.__agriflow_trans_timer = setTimeout(() => {
        applyDomTranslations(targetLang);
      }, 150);
    });

    activeObserver.observe(root, {
      childList: true,
      subtree: true
    });
  }
}
