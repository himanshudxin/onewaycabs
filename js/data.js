/**
 * OneWayTaxiBihar (onewaytaxibihar.com) - Comprehensive Bihar & Pan-India Database
 * Complete 38 Districts Database with Divisions, Landmark POIs, Major Intercity Routes,
 * Fleet Pricing, Passenger Reviews, Corporate Solutions & FAQs.
 */

// 1. Complete Database of all 38 Districts of Bihar + Major Connecting Outstation Hubs
const OTB_CITIES = [
  // ============================================================================
  // 1. PATNA DISTRICT & METROPOLITAN REGION
  // ============================================================================
  { id: "patna", name: "Patna", hindiName: "पटना", type: "district", typeLabel: "District HQ", district: "Patna", districtId: "patna", division: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376, popular: true, keywords: ["patna", "patliputra", "capital", "high court", "dak bunglow", "gandhi maidan"], tag: "Capital City & Administrative Center", airport: "Jay Prakash Narayan International (PAT)", tollEst: 0 },
  { id: "danapur", name: "Danapur", hindiName: "दानापुर", type: "subdivision", typeLabel: "Sub-Division", district: "Patna", districtId: "patna", division: "Patna", state: "Bihar", lat: 25.6333, lng: 85.0500, popular: true, keywords: ["danapur", "cantt", "khagaul", "railway division", "subdivision"], tag: "Patna Metropolitan & Railway Cantonment", tollEst: 0 },
  { id: "patna-airport", name: "Patna Airport (PAT)", hindiName: "पटना एयरपोर्ट (जयप्रकाश नारायण)", type: "airport", typeLabel: "Airport Terminal", district: "Patna", districtId: "patna", division: "Patna", state: "Bihar", lat: 25.5913, lng: 85.0880, popular: true, keywords: ["patna airport", "pat", "jay prakash narayan", "flight", "domestic terminal"], tag: "Jay Prakash Narayan International Terminal", tollEst: 0 },
  { id: "patna-junction", name: "Patna Junction (PNBE)", hindiName: "पटना जंक्शन", type: "railway", typeLabel: "Railway Hub", district: "Patna", districtId: "patna", division: "Patna", state: "Bihar", lat: 25.6022, lng: 85.1346, popular: true, keywords: ["patna junction", "pnbe", "railway station", "dak bunglow", "central"], tag: "Central Railway Terminal & Metro Hub", tollEst: 0 },
  { id: "patliputra-junction", name: "Patliputra Junction (PPTA)", hindiName: "पाटलिपुत्र जंक्शन", type: "railway", typeLabel: "Railway Hub", district: "Patna", districtId: "patna", division: "Patna", state: "Bihar", lat: 25.6419, lng: 85.0936, popular: true, keywords: ["patliputra junction", "ppta", "digha", "north bihar trains"], tag: "Digha Bridge Connecting Terminal", tollEst: 0 },
  { id: "rajendra-nagar-terminal", name: "Rajendra Nagar Terminal (RJPB)", hindiName: "राजेंद्र नगर टर्मिनल", type: "railway", typeLabel: "Railway Hub", district: "Patna", districtId: "patna", division: "Patna", state: "Bihar", lat: 25.5976, lng: 85.1611, popular: false, keywords: ["rajendra nagar terminal", "rjpb", "kankarbagh"], tag: "East Patna Railway Terminal", tollEst: 0 },
  { id: "bihta", name: "Bihta", hindiName: "बिहटा", type: "subdivision", typeLabel: "Sub-Division", district: "Patna", districtId: "patna", division: "Patna", state: "Bihar", lat: 25.5683, lng: 84.8697, popular: true, keywords: ["bihta", "upcoming airport", "iit bihta", "esic hospital", "subdivision"], tag: "Upcoming Int'l Airport & IIT Tech Hub", tollEst: 0 },
  { id: "barh", name: "Barh", hindiName: "बाढ़", type: "subdivision", typeLabel: "Sub-Division", district: "Patna", districtId: "patna", division: "Patna", state: "Bihar", lat: 25.4800, lng: 85.7100, popular: true, keywords: ["barh", "ntpc barh", "subdivision", "ganga ghat"], tag: "NTPC Super Thermal Power & Ganga Ghat", tollEst: 55 },
  { id: "bakhtiyarpur", name: "Bakhtiyarpur", hindiName: "बख्तियारपुर", type: "subdivision", typeLabel: "Sub-Division", district: "Patna", districtId: "patna", division: "Patna", state: "Bihar", lat: 25.4567, lng: 85.5256, popular: true, keywords: ["bakhtiyarpur", "expressway", "rajgir fork", "subdivision"], tag: "Expressway Junction to Rajgir & Mokama", tollEst: 40 },
  { id: "mokama", name: "Mokama", hindiName: "मोकामा", type: "subdivision", typeLabel: "Sub-Division", district: "Patna", districtId: "patna", division: "Patna", state: "Bihar", lat: 25.3983, lng: 85.9189, popular: true, keywords: ["mokama", "rajendra setu", "ganga bridge", "bharat wagon", "subdivision"], tag: "Historic Ganga Bridge & Industrial Hub", tollEst: 75 },
  { id: "fatuha", name: "Fatuha", hindiName: "फतुहा", type: "subdivision", typeLabel: "Sub-Division", district: "Patna", districtId: "patna", division: "Patna", state: "Bihar", lat: 25.5083, lng: 85.3117, popular: false, keywords: ["fatuha", "punpun sangam", "industrial area", "subdivision"], tag: "Punpun River Confluence & Industrial Belt", tollEst: 25 },
  { id: "masaurhi", name: "Masaurhi (Taregna)", hindiName: "मसौढ़ी (तारेगना)", type: "subdivision", typeLabel: "Sub-Division", district: "Patna", districtId: "patna", division: "Patna", state: "Bihar", lat: 25.3500, lng: 85.0333, popular: false, keywords: ["masaurhi", "taregna", "aryabhata", "subdivision"], tag: "Aryabhata Ancient Solar Observatory", tollEst: 20 },
  { id: "paliganj", name: "Paliganj", hindiName: "पालीगंज", type: "subdivision", typeLabel: "Sub-Division", district: "Patna", districtId: "patna", division: "Patna", state: "Bihar", lat: 25.3333, lng: 84.8167, popular: false, keywords: ["paliganj", "son canal", "subdivision"], tag: "Son River Agriculture Sub-Division", tollEst: 30 },
  { id: "aiims-patna", name: "AIIMS Patna (Phulwari Sharif)", hindiName: "एम्स पटना (फुलवारी शरीफ)", type: "town", typeLabel: "Medical Hub", district: "Patna", districtId: "patna", division: "Patna", state: "Bihar", lat: 25.5606, lng: 85.0456, popular: true, keywords: ["aiims", "phulwari sharif", "hospital", "medical institute"], tag: "National Premier Medical Institute", tollEst: 0 },
  { id: "boring-road", name: "Boring Road (Patna)", hindiName: "बोरिंग रोड (पटना)", type: "town", typeLabel: "City Center", district: "Patna", districtId: "patna", division: "Patna", state: "Bihar", lat: 25.6178, lng: 85.1189, popular: false, keywords: ["boring road", "patna central", "coaching hub"], tag: "Commercial, Coaching & Residential Hub", tollEst: 0 },
  { id: "kankarbagh", name: "Kankarbagh (Patna)", hindiName: "कंकड़बाग (पटना)", type: "town", typeLabel: "City Center", district: "Patna", districtId: "patna", division: "Patna", state: "Bihar", lat: 25.5967, lng: 85.1556, popular: false, keywords: ["kankarbagh", "patna south", "residential colony"], tag: "Major Medical & Residential Hub", tollEst: 0 },

  // ============================================================================
  // 2. NALANDA DISTRICT
  // ============================================================================
  { id: "nalanda", name: "Nalanda (Bihar Sharif)", hindiName: "नालंदा (बिहारशरीफ)", type: "district", typeLabel: "District HQ", district: "Nalanda", districtId: "nalanda", division: "Patna", state: "Bihar", lat: 25.1978, lng: 85.5186, popular: true, keywords: ["nalanda", "bihar sharif", "smart city", "silk weaving"], tag: "District Seat & Handloom Silk Smart City", tollEst: 65 },
  { id: "rajgir", name: "Rajgir", hindiName: "राजगीर", type: "subdivision", typeLabel: "Sub-Division", district: "Nalanda", districtId: "nalanda", division: "Patna", state: "Bihar", lat: 25.0300, lng: 85.4200, popular: true, keywords: ["rajgir", "glass bridge", "vishwa shanti stupa", "hot springs", "ropeway", "subdivision"], tag: "Glass Bridge, Ropeway & Peace Pagoda", tollEst: 75 },
  { id: "hilsa", name: "Hilsa", hindiName: "हिलसा", type: "subdivision", typeLabel: "Sub-Division", district: "Nalanda", districtId: "nalanda", division: "Patna", state: "Bihar", lat: 25.3167, lng: 85.2833, popular: false, keywords: ["hilsa", "nalanda", "subdivision"], tag: "Historic Market & Agricultural Hub", tollEst: 45 },
  { id: "islampur", name: "Islampur", hindiName: "इस्लामपुर", type: "town", typeLabel: "Town", district: "Nalanda", districtId: "nalanda", division: "Patna", state: "Bihar", lat: 25.1500, lng: 85.2000, popular: false, keywords: ["islampur", "nalanda", "railway terminus"], tag: "Southern Nalanda Trading Center", tollEst: 50 },
  { id: "silao", name: "Silao", hindiName: "सिलाव", type: "town", typeLabel: "Heritage Town", district: "Nalanda", districtId: "nalanda", division: "Patna", state: "Bihar", lat: 25.0833, lng: 85.4167, popular: false, keywords: ["silao", "khaja", "gi tag sweets"], tag: "Famous GI-Tagged Silao Khaja Hub", tollEst: 70 },
  { id: "harnaut", name: "Harnaut", hindiName: "हरनौत", type: "town", typeLabel: "Town", district: "Nalanda", districtId: "nalanda", division: "Patna", state: "Bihar", lat: 25.3667, lng: 85.5333, popular: false, keywords: ["harnaut", "railway carriage workshop"], tag: "Railway Carriage Maintenance Hub", tollEst: 55 },

  // ============================================================================
  // 3. BHOJPUR (ARA) DISTRICT
  // ============================================================================
  { id: "bhojpur", name: "Bhojpur (Ara)", hindiName: "भोजपुर (आरा)", type: "district", typeLabel: "District HQ", district: "Bhojpur", districtId: "bhojpur", division: "Patna", state: "Bihar", lat: 25.5541, lng: 84.6644, popular: true, keywords: ["ara", "bhojpur", "veer kunwar singh", "junction"], tag: "Historic Land of Veer Kunwar Singh", airport: "Patna Airport", tollEst: 50 },
  { id: "jagdishpur", name: "Jagdishpur", hindiName: "जगदीशपुर", type: "subdivision", typeLabel: "Sub-Division", district: "Bhojpur", districtId: "bhojpur", division: "Patna", state: "Bihar", lat: 25.4667, lng: 84.4167, popular: false, keywords: ["jagdishpur", "kunwar singh fort", "subdivision"], tag: "1857 Uprising Heritage Fort", tollEst: 65 },
  { id: "piro", name: "Piro", hindiName: "पीरो", type: "subdivision", typeLabel: "Sub-Division", district: "Bhojpur", districtId: "bhojpur", division: "Patna", state: "Bihar", lat: 25.3333, lng: 84.4167, popular: false, keywords: ["piro", "bhojpur", "subdivision"], tag: "South Bhojpur Commercial Center", tollEst: 65 },
  { id: "koilwar", name: "Koilwar", hindiName: "कोइलवर", type: "town", typeLabel: "Town", district: "Bhojpur", districtId: "bhojpur", division: "Patna", state: "Bihar", lat: 25.5833, lng: 84.8000, popular: false, keywords: ["koilwar", "abdul bari bridge", "son river sand"], tag: "Historic Son River Rail-Road Bridge", tollEst: 40 },

  // ============================================================================
  // 4. BUXAR DISTRICT
  // ============================================================================
  { id: "buxar", name: "Buxar", hindiName: "बक्सर", type: "district", typeLabel: "District HQ", district: "Buxar", districtId: "buxar", division: "Patna", state: "Bihar", lat: 25.5647, lng: 83.9777, popular: true, keywords: ["buxar", "battle of buxar", "ramrekha ghat", "ganga"], tag: "Historic Ganga Ghats & Battle of Buxar", airport: "Patna / Varanasi Airport", tollEst: 110 },
  { id: "dumraon", name: "Dumraon", hindiName: "डुमरांव", type: "subdivision", typeLabel: "Sub-Division", district: "Buxar", districtId: "buxar", division: "Patna", state: "Bihar", lat: 25.5500, lng: 84.1500, popular: false, keywords: ["dumraon", "bismillah khan", "subdivision"], tag: "Birthplace of Bharat Ratna Bismillah Khan", tollEst: 95 },
  { id: "brahmpur", name: "Brahmpur", hindiName: "ब्रह्मपुर", type: "town", typeLabel: "Town", district: "Buxar", districtId: "buxar", division: "Patna", state: "Bihar", lat: 25.6000, lng: 84.3000, popular: false, keywords: ["brahmpur", "baba brahmeshwar nath", "shiva dham"], tag: "Ancient Baba Brahmeshwar Nath Mandir", tollEst: 85 },

  // ============================================================================
  // 5. ROHTAS DISTRICT
  // ============================================================================
  { id: "rohtas", name: "Rohtas (Sasaram)", hindiName: "रोहतास (सासाराम)", type: "district", typeLabel: "District HQ", district: "Rohtas", districtId: "rohtas", division: "Patna", state: "Bihar", lat: 24.9536, lng: 84.0159, popular: true, keywords: ["sasaram", "rohtas", "sher shah suri tomb", "grand trunk road"], tag: "Sher Shah Suri Mausoleum & GT Road", airport: "Gaya / Varanasi Airport", tollEst: 140 },
  { id: "dehri-on-sone", name: "Dehri-on-Sone", hindiName: "डेहरी-ऑन-सोन", type: "subdivision", typeLabel: "Sub-Division", district: "Rohtas", districtId: "rohtas", division: "Patna", state: "Bihar", lat: 24.9167, lng: 84.1833, popular: true, keywords: ["dehri", "dehri on sone", "dalmianagar", "indrapuri barrage", "subdivision"], tag: "Industrial Capital, Mining & Indrapuri Barrage", tollEst: 135 },
  { id: "bikramganj", name: "Bikramganj", hindiName: "बिक्रमगंज", type: "subdivision", typeLabel: "Sub-Division", district: "Rohtas", districtId: "rohtas", division: "Patna", state: "Bihar", lat: 25.2000, lng: 84.2500, popular: false, keywords: ["bikramganj", "rice bowl", "subdivision"], tag: "Rice Bowl Agricultural Trading Center", tollEst: 110 },
  { id: "nokha", name: "Nokha", hindiName: "नोखा", type: "town", typeLabel: "Town", district: "Rohtas", districtId: "rohtas", division: "Patna", state: "Bihar", lat: 25.0667, lng: 84.1333, popular: false, keywords: ["nokha", "rohtas", "rice mills"], tag: "Major Agro-Processing & Rice Mill Center", tollEst: 125 },

  // ============================================================================
  // 6. KAIMUR DISTRICT
  // ============================================================================
  { id: "kaimur", name: "Kaimur (Bhabua)", hindiName: "कैमूर (भभुआ)", type: "district", typeLabel: "District HQ", district: "Kaimur", districtId: "kaimur", division: "Patna", state: "Bihar", lat: 25.0450, lng: 83.6144, popular: false, keywords: ["bhabua", "kaimur", "hills", "mundeshwari"], tag: "Maa Mundeshwari Temple & Kaimur Hills", airport: "Varanasi Airport", tollEst: 160 },
  { id: "mohania", name: "Mohania", hindiName: "मोहनिया", type: "subdivision", typeLabel: "Sub-Division", district: "Kaimur", districtId: "kaimur", division: "Patna", state: "Bihar", lat: 25.1667, lng: 83.6167, popular: true, keywords: ["mohania", "gt road", "nh19", "railway station", "subdivision"], tag: "Grand Trunk Road NH-19 Transit Center", tollEst: 145 },
  { id: "kudra", name: "Kudra", hindiName: "कुदरा", type: "town", typeLabel: "Town", district: "Kaimur", districtId: "kaimur", division: "Patna", state: "Bihar", lat: 25.0500, lng: 83.8167, popular: false, keywords: ["kudra", "rice mill", "kaimur"], tag: "Rice Processing & Highway Industrial Hub", tollEst: 135 },

  // ============================================================================
  // 7. GAYA DISTRICT
  // ============================================================================
  { id: "gaya", name: "Gaya", hindiName: "गया", type: "district", typeLabel: "District HQ", district: "Gaya", districtId: "gaya", division: "Magadh", state: "Bihar", lat: 24.7914, lng: 85.0002, popular: true, keywords: ["gaya", "vishnupad", "pitrapaksha", "junction", "falgu"], tag: "Sacred Vishnupad Temple & Pitrapaksha Hub", airport: "Gaya International Airport (GAY)", tollEst: 110 },
  { id: "bodh-gaya", name: "Bodh Gaya", hindiName: "बोधगया", type: "subdivision", typeLabel: "Sub-Division", district: "Gaya", districtId: "gaya", division: "Magadh", state: "Bihar", lat: 24.6961, lng: 84.9870, popular: true, keywords: ["bodh gaya", "mahabodhi", "buddha", "unesco", "monasteries", "subdivision"], tag: "Mahabodhi Temple UNESCO World Heritage", tollEst: 115 },
  { id: "gaya-airport", name: "Gaya Airport (GAY)", hindiName: "गया अंतर्राष्ट्रीय हवाई अड्डा", type: "airport", typeLabel: "Airport Terminal", district: "Gaya", districtId: "gaya", division: "Magadh", state: "Bihar", lat: 24.7441, lng: 84.9512, popular: true, keywords: ["gaya airport", "gay", "international flight", "buddhist pilgrim flights"], tag: "Gaya International Buddhist Airport", tollEst: 115 },
  { id: "sherghati", name: "Sherghati", hindiName: "शेरघाटी", type: "subdivision", typeLabel: "Sub-Division", district: "Gaya", districtId: "gaya", division: "Magadh", state: "Bihar", lat: 24.5667, lng: 84.7833, popular: false, keywords: ["sherghati", "gt road", "nh19", "subdivision"], tag: "Grand Trunk Road Commercial Gateway", tollEst: 140 },
  { id: "tekari", name: "Tekari", hindiName: "टिकारी", type: "subdivision", typeLabel: "Sub-Division", district: "Gaya", districtId: "gaya", division: "Magadh", state: "Bihar", lat: 24.9333, lng: 84.8333, popular: false, keywords: ["tekari", "historic fort", "subdivision"], tag: "Tekari Raj Palace & Agricultural Center", tollEst: 100 },
  { id: "dobhi", name: "Dobhi", hindiName: "डोभी", type: "town", typeLabel: "Highway Junction", district: "Gaya", districtId: "gaya", division: "Magadh", state: "Bihar", lat: 24.5333, lng: 84.9667, popular: false, keywords: ["dobhi", "golden quadrilateral", "patna gaya highway junction"], tag: "Golden Quadrilateral & NH-22 Interchange", tollEst: 130 },

  // ============================================================================
  // 8. AURANGABAD DISTRICT
  // ============================================================================
  { id: "aurangabad-bihar", name: "Aurangabad (Bihar)", hindiName: "औरंगाबाद (बिहार)", type: "district", typeLabel: "District HQ", district: "Aurangabad", districtId: "aurangabad-bihar", division: "Magadh", state: "Bihar", lat: 24.7534, lng: 84.3736, popular: true, keywords: ["aurangabad", "gt road", "deo sun temple", "chittorgarh of bihar"], tag: "Grand Trunk Road Corridor & Heritage", airport: "Gaya Airport", tollEst: 125 },
  { id: "daudnagar", name: "Daudnagar", hindiName: "दाउदनगर", type: "subdivision", typeLabel: "Sub-Division", district: "Aurangabad", districtId: "aurangabad-bihar", division: "Magadh", state: "Bihar", lat: 25.0333, lng: 84.4000, popular: false, keywords: ["daudnagar", "son river", "carpet weaving", "subdivision"], tag: "Historic Son River Fort & Textile Hub", tollEst: 95 },
  { id: "deo", name: "Deo (Sun Temple)", hindiName: "देव (सूर्य मंदिर)", type: "town", typeLabel: "Pilgrimage Center", district: "Aurangabad", districtId: "aurangabad-bihar", division: "Magadh", state: "Bihar", lat: 24.6500, lng: 84.4333, popular: true, keywords: ["deo", "sun temple", "surya mandir", "chhath puja dham"], tag: "Ancient Sun Temple & Major Chhath Dham", tollEst: 135 },
  { id: "nabinagar", name: "Nabinagar", hindiName: "नवीनगर", type: "town", typeLabel: "Town", district: "Aurangabad", districtId: "aurangabad-bihar", division: "Magadh", state: "Bihar", lat: 24.6167, lng: 84.1333, popular: false, keywords: ["nabinagar", "ntpc thermal power"], tag: "Super Thermal Power Generation Plant", tollEst: 145 },

  // ============================================================================
  // 9. NAWADA DISTRICT
  // ============================================================================
  { id: "nawada", name: "Nawada", hindiName: "नवादा", type: "district", typeLabel: "District HQ", district: "Nawada", districtId: "nawada", division: "Magadh", state: "Bihar", lat: 24.8878, lng: 85.5414, popular: true, keywords: ["nawada", "silk", "tussar", "kakolat"], tag: "Silk Weaving & Mineral Resource Hub", airport: "Gaya / Patna Airport", tollEst: 95 },
  { id: "rajauli", name: "Rajauli", hindiName: "रजौली", type: "subdivision", typeLabel: "Sub-Division", district: "Nawada", districtId: "nawada", division: "Magadh", state: "Bihar", lat: 24.6500, lng: 85.5000, popular: false, keywords: ["rajauli", "jharkhand border", "nh20", "subdivision"], tag: "Jharkhand Border Forest Gateway", tollEst: 120 },
  { id: "kakolat", name: "Kakolat Falls", hindiName: "ककोलत जलप्रपात", type: "town", typeLabel: "Eco-Tourism", district: "Nawada", districtId: "nawada", division: "Magadh", state: "Bihar", lat: 24.7167, lng: 85.6000, popular: true, keywords: ["kakolat", "waterfall", "picnic", "cooling natural springs"], tag: "Scenic Cold Water Spring & Waterfall", tollEst: 115 },
  { id: "hisua", name: "Hisua", hindiName: "हिसुआ", type: "town", typeLabel: "Town", district: "Nawada", districtId: "nawada", division: "Magadh", state: "Bihar", lat: 24.8333, lng: 85.4167, popular: false, keywords: ["hisua", "nawada", "rajgir road"], tag: "Rajgir-Nawada Highway Commercial Town", tollEst: 85 },

  // ============================================================================
  // 10. JEHANABAD DISTRICT
  // ============================================================================
  { id: "jehanabad", name: "Jehanabad", hindiName: "जहानाबाद", type: "district", typeLabel: "District HQ", district: "Jehanabad", districtId: "jehanabad", division: "Magadh", state: "Bihar", lat: 25.2133, lng: 84.9867, popular: false, keywords: ["jehanabad", "patna gaya route", "barabar"], tag: "Patna-Gaya Expressway Mid-Station", airport: "Patna Airport", tollEst: 45 },
  { id: "makhdumpur", name: "Makhdumpur (Barabar)", hindiName: "मखदुमपुर (बराबर गुफाएं)", type: "town", typeLabel: "Heritage Town", district: "Jehanabad", districtId: "jehanabad", division: "Magadh", state: "Bihar", lat: 25.1000, lng: 84.9833, popular: false, keywords: ["makhdumpur", "barabar caves", "ashokan caves", "siddhnath temple"], tag: "Barabar Rock-Cut Caves & Siddhnath Mandir", tollEst: 65 },

  // ============================================================================
  // 11. ARWAL DISTRICT
  // ============================================================================
  { id: "arwal", name: "Arwal", hindiName: "अरवल", type: "district", typeLabel: "District HQ", district: "Arwal", districtId: "arwal", division: "Magadh", state: "Bihar", lat: 25.2444, lng: 84.6789, popular: false, keywords: ["arwal", "son river", "agriculture"], tag: "Son River Valley Agricultural Center", airport: "Patna Airport", tollEst: 55 },

  // ============================================================================
  // 12. MUZAFFARPUR DISTRICT
  // ============================================================================
  { id: "muzaffarpur", name: "Muzaffarpur", hindiName: "मुजफ्फरपुर", type: "district", typeLabel: "District HQ", district: "Muzaffarpur", districtId: "muzaffarpur", division: "Tirhut", state: "Bihar", lat: 26.1209, lng: 85.3647, popular: true, keywords: ["muzaffarpur", "litchi", "commercial capital", "junction", "garibnath"], tag: "Commercial Capital of North Bihar & Shahi Litchi", airport: "Patna / Darbhanga Airport", tollEst: 85 },
  { id: "kanti", name: "Kanti", hindiName: "कांटी", type: "town", typeLabel: "Industrial Hub", district: "Muzaffarpur", districtId: "muzaffarpur", division: "Tirhut", state: "Bihar", lat: 26.2000, lng: 85.3000, popular: false, keywords: ["kanti", "thermal power", "ntpc kanti"], tag: "Kanti Bijlee Utpadan Nigam (NTPC)", tollEst: 95 },
  { id: "motipur", name: "Motipur", hindiName: "मोतीपुर", type: "town", typeLabel: "Town", district: "Muzaffarpur", districtId: "muzaffarpur", division: "Tirhut", state: "Bihar", lat: 26.2833, lng: 85.1833, popular: false, keywords: ["motipur", "mega food park", "sugar mill"], tag: "Mega Food Park & Sugar Production", tollEst: 110 },
  { id: "saraiya", name: "Saraiya", hindiName: "सरैया", type: "town", typeLabel: "Town", district: "Muzaffarpur", districtId: "muzaffarpur", division: "Tirhut", state: "Bihar", lat: 25.9667, lng: 85.1667, popular: false, keywords: ["saraiya", "vaishali border", "buddha stupa route"], tag: "Gandak Basin Agro Trade Center", tollEst: 70 },

  // ============================================================================
  // 13. VAISHALI (HAJIPUR) DISTRICT
  // ============================================================================
  { id: "vaishali", name: "Vaishali (Hajipur)", hindiName: "वैशाली (हाजीपुर)", type: "district", typeLabel: "District HQ", district: "Vaishali", districtId: "vaishali", division: "Tirhut", state: "Bihar", lat: 25.6858, lng: 85.2155, popular: true, keywords: ["hajipur", "vaishali", "banana", "ecr headquarters", "jp setu"], tag: "East Central Railway Zonal HQ & Banana Trade", airport: "Patna Airport", tollEst: 40 },
  { id: "mahua", name: "Mahua", hindiName: "महुआ", type: "subdivision", typeLabel: "Sub-Division", district: "Vaishali", districtId: "vaishali", division: "Tirhut", state: "Bihar", lat: 25.8667, lng: 85.4000, popular: false, keywords: ["mahua", "vaishali", "subdivision"], tag: "Eastern Vaishali Agricultural Market", tollEst: 65 },
  { id: "vaishali-town", name: "Vaishali Town (Ruins)", hindiName: "वैशाली (ऐतिहासिक स्थल)", type: "town", typeLabel: "Heritage Site", district: "Vaishali", districtId: "vaishali", division: "Tirhut", state: "Bihar", lat: 25.9867, lng: 85.1256, popular: true, keywords: ["vaishali ruins", "ashoka pillar", "mahavira birthplace", "first republic"], tag: "Birthplace of Lord Mahavira & World's 1st Republic", tollEst: 75 },
  { id: "sonepur", name: "Sonepur", hindiName: "सोनपुर", type: "subdivision", typeLabel: "Sub-Division", district: "Saran", districtId: "saran", division: "Saran", state: "Bihar", lat: 25.7000, lng: 85.1833, popular: true, keywords: ["sonepur", "cattle fair", "harihar nath", "gandak ganga sangam", "subdivision"], tag: "World Famous Cattle Fair & Harihar Nath Mandir", tollEst: 40 },

  // ============================================================================
  // 14. EAST CHAMPARAN (MOTIHARI) DISTRICT
  // ============================================================================
  { id: "east-champaran", name: "East Champaran (Motihari)", hindiName: "पूर्वी चंपारण (मोतिहारी)", type: "district", typeLabel: "District HQ", district: "East Champaran", districtId: "east-champaran", division: "Tirhut", state: "Bihar", lat: 26.6469, lng: 84.9089, popular: true, keywords: ["motihari", "champaran", "gandhi satyagraha", "central university"], tag: "Mahatma Gandhi Champaran Satyagraha Land", airport: "Patna / Darbhanga Airport", tollEst: 135 },
  { id: "raxaul", name: "Raxaul (Nepal Border)", hindiName: "रक्सौल (नेपाल सीमा)", type: "subdivision", typeLabel: "Border Port", district: "East Champaran", districtId: "east-champaran", division: "Tirhut", state: "Bihar", lat: 26.9800, lng: 84.8500, popular: true, keywords: ["raxaul", "nepal border", "birgunj", "icp", "subdivision", "customs"], tag: "Primary Indo-Nepal Commercial Trade Gateway", tollEst: 175 },
  { id: "areraj", name: "Areraj", hindiName: "अरेराज", type: "subdivision", typeLabel: "Sub-Division", district: "East Champaran", districtId: "east-champaran", division: "Tirhut", state: "Bihar", lat: 26.5500, lng: 84.6833, popular: false, keywords: ["areraj", "someshwar nath temple", "subdivision"], tag: "Historic Someshwar Nath Mahadev Mandir", tollEst: 125 },
  { id: "kesaria", name: "Kesaria Stupa", hindiName: "केसरिया स्तूप", type: "town", typeLabel: "Heritage Site", district: "East Champaran", districtId: "east-champaran", division: "Tirhut", state: "Bihar", lat: 26.3500, lng: 84.8833, popular: true, keywords: ["kesaria", "buddhist stupa", "tallest stupa"], tag: "World's Tallest Ancient Buddhist Stupa", tollEst: 110 },
  { id: "chakia", name: "Chakia", hindiName: "चकिया", type: "subdivision", typeLabel: "Sub-Division", district: "East Champaran", districtId: "east-champaran", division: "Tirhut", state: "Bihar", lat: 26.4167, lng: 85.0500, popular: false, keywords: ["chakia", "nh27", "subdivision"], tag: "NH-27 East-West Corridor Transit Town", tollEst: 115 },

  // ============================================================================
  // 15. WEST CHAMPARAN (BETTIAH) DISTRICT
  // ============================================================================
  { id: "west-champaran", name: "West Champaran (Bettiah)", hindiName: "पश्चिमी चंपारण (बेतिया)", type: "district", typeLabel: "District HQ", district: "West Champaran", districtId: "west-champaran", division: "Tirhut", state: "Bihar", lat: 26.8024, lng: 84.5028, popular: true, keywords: ["bettiah", "west champaran", "bettiah raj"], tag: "Historic Bettiah Raj Estate & Agricultural Belt", airport: "Gorakhpur / Patna Airport", tollEst: 180 },
  { id: "bagaha", name: "Bagaha", hindiName: "बगहा", type: "subdivision", typeLabel: "Sub-Division", district: "West Champaran", districtId: "west-champaran", division: "Tirhut", state: "Bihar", lat: 27.1000, lng: 84.0833, popular: false, keywords: ["bagaha", "police district", "gandak", "subdivision"], tag: "Gandak River Valley Police District", tollEst: 215 },
  { id: "narkatiaganj", name: "Narkatiaganj", hindiName: "नरकटियागंज", type: "subdivision", typeLabel: "Sub-Division", district: "West Champaran", districtId: "west-champaran", division: "Tirhut", state: "Bihar", lat: 27.1167, lng: 84.4667, popular: false, keywords: ["narkatiaganj", "railway junction", "sugar mill", "subdivision"], tag: "Major Railway Junction & Sugar Production", tollEst: 200 },
  { id: "valmiki-nagar", name: "Valmiki Nagar", hindiName: "वाल्मीकि नगर", type: "town", typeLabel: "Tiger Reserve", district: "West Champaran", districtId: "west-champaran", division: "Tirhut", state: "Bihar", lat: 27.4333, lng: 83.9167, popular: true, keywords: ["valmiki nagar", "tiger reserve", "national park", "gandak barrage"], tag: "Valmiki National Tiger Reserve & Eco-Tourism", tollEst: 240 },

  // ============================================================================
  // 16. SITAMARHI DISTRICT
  // ============================================================================
  { id: "sitamarhi", name: "Sitamarhi", hindiName: "सीतामढ़ी", type: "district", typeLabel: "District HQ", district: "Sitamarhi", districtId: "sitamarhi", division: "Tirhut", state: "Bihar", lat: 26.5978, lng: 85.4892, popular: true, keywords: ["sitamarhi", "punaura dham", "sita birthplace", "ramayana circuit"], tag: "Birthplace of Mata Sita & Punaura Dham", airport: "Darbhanga Airport", tollEst: 120 },
  { id: "bairgania", name: "Bairgania", hindiName: "बैरगनिया", type: "subdivision", typeLabel: "Sub-Division", district: "Sitamarhi", districtId: "sitamarhi", division: "Tirhut", state: "Bihar", lat: 26.7833, lng: 85.2833, popular: false, keywords: ["bairgania", "nepal border", "subdivision"], tag: "Indo-Nepal Cross-Border Trading Center", tollEst: 140 },
  { id: "pupri", name: "Pupri (Janakpur Road)", hindiName: "पुपरी (जनकपुर रोड)", type: "subdivision", typeLabel: "Sub-Division", district: "Sitamarhi", districtId: "sitamarhi", division: "Tirhut", state: "Bihar", lat: 26.5500, lng: 85.7000, popular: false, keywords: ["pupri", "janakpur road", "subdivision"], tag: "Janakpur Road Pilgrimage Highway", tollEst: 115 },

  // ============================================================================
  // 17. SHEOHAR DISTRICT
  // ============================================================================
  { id: "sheohar", name: "Sheohar", hindiName: "शिवहर", type: "district", typeLabel: "District HQ", district: "Sheohar", districtId: "sheohar", division: "Tirhut", state: "Bihar", lat: 26.5167, lng: 85.2833, popular: false, keywords: ["sheohar", "bagmati river"], tag: "Bagmati River Agriculture District", airport: "Darbhanga Airport", tollEst: 95 },

  // ============================================================================
  // 18. DARBHANGA DISTRICT
  // ============================================================================
  { id: "darbhanga", name: "Darbhanga", hindiName: "दरभंगा", type: "district", typeLabel: "District HQ", district: "Darbhanga", districtId: "darbhanga", division: "Darbhanga", state: "Bihar", lat: 26.1542, lng: 85.8918, popular: true, keywords: ["darbhanga", "mithila", "raj darbhanga", "airport hub", "aiims darbhanga"], tag: "Cultural Capital of Mithila & Aviation Hub", airport: "Darbhanga Airport (DMB)", tollEst: 130 },
  { id: "darbhanga-airport", name: "Darbhanga Airport (DMB)", hindiName: "दरभंगा एयरपोर्ट", type: "airport", typeLabel: "Airport Terminal", district: "Darbhanga", districtId: "darbhanga", division: "Darbhanga", state: "Bihar", lat: 26.1969, lng: 85.9142, popular: true, keywords: ["darbhanga airport", "dmb", "flight", "north bihar airport"], tag: "North Bihar Operational Commercial Airport", tollEst: 135 },
  { id: "benipur", name: "Benipur", hindiName: "बेनीपुर", type: "subdivision", typeLabel: "Sub-Division", district: "Darbhanga", districtId: "darbhanga", division: "Darbhanga", state: "Bihar", lat: 26.0833, lng: 86.1333, popular: false, keywords: ["benipur", "darbhanga", "subdivision"], tag: "Central Mithila Commercial Market", tollEst: 145 },
  { id: "biraul", name: "Biraul", hindiName: "बिरौल", type: "subdivision", typeLabel: "Sub-Division", district: "Darbhanga", districtId: "darbhanga", division: "Darbhanga", state: "Bihar", lat: 25.9667, lng: 86.1833, popular: false, keywords: ["biraul", "subdivision", "kusheshwar asthan route"], tag: "Eastern Darbhanga Sub-Division Center", tollEst: 155 },
  { id: "kusheshwar-asthan", name: "Kusheshwar Asthan", hindiName: "कुशेश्वरस्थान", type: "town", typeLabel: "Pilgrimage Center", district: "Darbhanga", districtId: "darbhanga", division: "Darbhanga", state: "Bihar", lat: 25.8500, lng: 86.2500, popular: false, keywords: ["kusheshwar asthan", "shiva temple", "bird sanctuary"], tag: "Famous Shiva Temple & Migratory Bird Wetland", tollEst: 160 },

  // ============================================================================
  // 19. MADHUBANI DISTRICT
  // ============================================================================
  { id: "madhubani", name: "Madhubani", hindiName: "मधुबनी", type: "district", typeLabel: "District HQ", district: "Madhubani", districtId: "madhubani", division: "Darbhanga", state: "Bihar", lat: 26.3533, lng: 86.0718, popular: true, keywords: ["madhubani", "mithila painting", "art", "makhana"], tag: "World Renowned Madhubani Folk Art & Makhana", airport: "Darbhanga Airport", tollEst: 145 },
  { id: "jhanjharpur", name: "Jhanjharpur", hindiName: "झंझारपुर", type: "subdivision", typeLabel: "Sub-Division", district: "Madhubani", districtId: "madhubani", division: "Darbhanga", state: "Bihar", lat: 26.2667, lng: 86.2833, popular: true, keywords: ["jhanjharpur", "nh27", "east west corridor", "subdivision"], tag: "NH-27 East-West Expressway Corridor Town", tollEst: 155 },
  { id: "benipatti", name: "Benipatti", hindiName: "बेनीपट्टी", type: "subdivision", typeLabel: "Sub-Division", district: "Madhubani", districtId: "madhubani", division: "Darbhanga", state: "Bihar", lat: 26.4667, lng: 85.9167, popular: false, keywords: ["benipatti", "uchchaith bhagwati", "kalidasa sthan", "subdivision"], tag: "Uchchaith Bhagwati Mandir (Kalidasa Sthan)", tollEst: 140 },
  { id: "jainagar", name: "Jainagar (Nepal Gateway)", hindiName: "जयनगर (नेपाल सीमा)", type: "subdivision", typeLabel: "Border Terminal", district: "Madhubani", districtId: "madhubani", division: "Darbhanga", state: "Bihar", lat: 26.5833, lng: 86.1333, popular: true, keywords: ["jainagar", "nepal rail", "kurtha train", "customs", "subdivision"], tag: "Indo-Nepal Cross-Border Passenger Rail Gateway", tollEst: 165 },

  // ============================================================================
  // 20. SAMASTIPUR DISTRICT
  // ============================================================================
  { id: "samastipur", name: "Samastipur", hindiName: "समस्तीपुर", type: "district", typeLabel: "District HQ", district: "Samastipur", districtId: "samastipur", division: "Darbhanga", state: "Bihar", lat: 25.8628, lng: 85.7811, popular: true, keywords: ["samastipur", "railway division", "agriculture university", "junction"], tag: "Major Railway Junction & Agricultural Center", airport: "Darbhanga / Patna Airport", tollEst: 85 },
  { id: "dalsinghsarai", name: "Dalsinghsarai", hindiName: "दलसिंहसराय", type: "subdivision", typeLabel: "Sub-Division", district: "Samastipur", districtId: "samastipur", division: "Darbhanga", state: "Bihar", lat: 25.6667, lng: 85.8333, popular: false, keywords: ["dalsinghsarai", "tobacco trade", "subdivision"], tag: "Commercial Agro-Trading & Highway Hub", tollEst: 95 },
  { id: "rosera", name: "Rosera", hindiName: "रोसड़ा", type: "subdivision", typeLabel: "Sub-Division", district: "Samastipur", districtId: "samastipur", division: "Darbhanga", state: "Bihar", lat: 25.7500, lng: 86.0167, popular: false, keywords: ["rosera", "budhi gandak", "subdivision"], tag: "Budhi Gandak River Trade Center", tollEst: 105 },
  { id: "shahpur-patori", name: "Shahpur Patori", hindiName: "शाहपुर पटोरी", type: "subdivision", typeLabel: "Sub-Division", district: "Samastipur", districtId: "samastipur", division: "Darbhanga", state: "Bihar", lat: 25.6000, lng: 85.5833, popular: false, keywords: ["patori", "shahpur patori", "subdivision"], tag: "Ganga Basin Agricultural Sub-Division", tollEst: 75 },
  { id: "pusa", name: "Pusa (Agri University)", hindiName: "पूसा (कृषि विश्वविद्यालय)", type: "town", typeLabel: "University Town", district: "Samastipur", districtId: "samastipur", division: "Darbhanga", state: "Bihar", lat: 25.9833, lng: 85.6667, popular: false, keywords: ["pusa", "rajendra prasad central agricultural university"], tag: "Dr. Rajendra Prasad Central Agricultural University", tollEst: 90 },

  // ============================================================================
  // 21. SARAN (CHHAPRA) DISTRICT
  // ============================================================================
  { id: "saran", name: "Saran (Chhapra)", hindiName: "सारण (छपरा)", type: "district", typeLabel: "District HQ", district: "Saran", districtId: "saran", division: "Saran", state: "Bihar", lat: 25.7796, lng: 84.7499, popular: true, keywords: ["chhapra", "saran", "ambika bhavani", "railway junction"], tag: "Ambika Bhavani Dham & Major Junction", airport: "Patna Airport", tollEst: 60 },
  { id: "marhaura", name: "Marhaura", hindiName: "मढ़ौरा", type: "subdivision", typeLabel: "Sub-Division", district: "Saran", districtId: "saran", division: "Saran", state: "Bihar", lat: 25.9667, lng: 84.8667, popular: false, keywords: ["marhaura", "diesel locomotive plant", "subdivision"], tag: "GE Indian Railways Diesel Locomotive Factory", tollEst: 75 },

  // ============================================================================
  // 22. SIWAN DISTRICT
  // ============================================================================
  { id: "siwan", name: "Siwan", hindiName: "सीवान", type: "district", typeLabel: "District HQ", district: "Siwan", districtId: "siwan", division: "Saran", state: "Bihar", lat: 26.2196, lng: 84.3567, popular: true, keywords: ["siwan", "rajendra prasad", "ziradei", "commercial"], tag: "Birthplace of 1st President Dr. Rajendra Prasad", airport: "Gorakhpur / Patna Airport", tollEst: 115 },
  { id: "maharajganj", name: "Maharajganj", hindiName: "महाराजगंज", type: "subdivision", typeLabel: "Sub-Division", district: "Siwan", districtId: "siwan", division: "Saran", state: "Bihar", lat: 26.1167, lng: 84.5000, popular: false, keywords: ["maharajganj", "siwan", "subdivision"], tag: "Eastern Siwan Commercial Trade Market", tollEst: 95 },
  { id: "mairwa", name: "Mairwa", hindiName: "मैरवा", type: "town", typeLabel: "Town", district: "Siwan", districtId: "siwan", division: "Saran", state: "Bihar", lat: 26.2333, lng: 84.1500, popular: false, keywords: ["mairwa", "baba hari ram brahma dham"], tag: "Baba Hari Ram Brahma Ji Pilgrimage Dham", tollEst: 130 },

  // ============================================================================
  // 23. GOPALGANJ DISTRICT
  // ============================================================================
  { id: "gopalganj", name: "Gopalganj", hindiName: "गोपालगंज", type: "district", typeLabel: "District HQ", district: "Gopalganj", districtId: "gopalganj", division: "Saran", state: "Bihar", lat: 26.4687, lng: 84.4442, popular: true, keywords: ["gopalganj", "thawe", "hathwa", "nh27"], tag: "Maa Thawe Durga Temple & Sugarcane Hub", airport: "Gorakhpur Airport", tollEst: 140 },
  { id: "hathwa", name: "Hathwa", hindiName: "हथुआ", type: "subdivision", typeLabel: "Sub-Division", district: "Gopalganj", districtId: "gopalganj", division: "Saran", state: "Bihar", lat: 26.3500, lng: 84.3000, popular: false, keywords: ["hathwa", "hathwa raj palace", "sainik school", "subdivision"], tag: "Historic Hathwa Raj Estate & Sainik School", tollEst: 135 },
  { id: "thawe", name: "Thawe (Durga Temple)", hindiName: "थावे (दुर्गा मंदिर)", type: "town", typeLabel: "Pilgrimage Center", district: "Gopalganj", districtId: "gopalganj", division: "Saran", state: "Bihar", lat: 26.4167, lng: 84.3833, popular: true, keywords: ["thawe", "thawe bhavani", "durga mandir", "shakti peeth"], tag: "Maa Thawe Bhavani Sacred Shakti Dham", tollEst: 135 },

  // ============================================================================
  // 24. BHAGALPUR DISTRICT
  // ============================================================================
  { id: "bhagalpur", name: "Bhagalpur", hindiName: "भागलपुर", type: "district", typeLabel: "District HQ", district: "Bhagalpur", districtId: "bhagalpur", division: "Bhagalpur", state: "Bihar", lat: 25.2425, lng: 87.0125, popular: true, keywords: ["bhagalpur", "silk city", "tussar silk", "vikramshila", "ganga dolphin"], tag: "Silk City of India & Vikramshila Heritage", airport: "Patna / Deoghar Airport", tollEst: 195 },
  { id: "kahalgaon", name: "Kahalgaon", hindiName: "कहलगांव", type: "subdivision", typeLabel: "Sub-Division", district: "Bhagalpur", districtId: "bhagalpur", division: "Bhagalpur", state: "Bihar", lat: 25.2667, lng: 87.2333, popular: true, keywords: ["kahalgaon", "ntpc kahalgaon", "thermal power", "bateshwar sthan", "subdivision"], tag: "NTPC Super Thermal Power & Bateshwar Sthan", tollEst: 220 },
  { id: "naugachia", name: "Naugachia", hindiName: "नवगछिया", type: "subdivision", typeLabel: "Sub-Division", district: "Bhagalpur", districtId: "bhagalpur", division: "Bhagalpur", state: "Bihar", lat: 25.3833, lng: 87.1000, popular: true, keywords: ["naugachia", "banana capital", "nh31", "subdivision"], tag: "Banana Capital of Bihar & NH-31 Junction", tollEst: 185 },
  { id: "sultanganj", name: "Sultanganj", hindiName: "सुल्तानगंज", type: "town", typeLabel: "Pilgrimage Center", district: "Bhagalpur", districtId: "bhagalpur", division: "Bhagalpur", state: "Bihar", lat: 25.2500, lng: 86.7333, popular: true, keywords: ["sultanganj", "ajgaibinath", "ganga jal", "kanwar yatra to deoghar"], tag: "Baba Ajgaibinath Dham & Kanwar Yatra Origin", tollEst: 175 },

  // ============================================================================
  // 25. BANKA DISTRICT
  // ============================================================================
  { id: "banka", name: "Banka", hindiName: "बांका", type: "district", typeLabel: "District HQ", district: "Banka", districtId: "banka", division: "Bhagalpur", state: "Bihar", lat: 24.8833, lng: 86.9167, popular: false, keywords: ["banka", "mandar hill", "chandan river"], tag: "Chandan River Basin & Mining District", airport: "Deoghar Airport", tollEst: 180 },
  { id: "bounsi", name: "Bounsi (Mandar Hill)", hindiName: "बौसी (मंदार पर्वत)", type: "town", typeLabel: "Heritage Site", district: "Banka", districtId: "banka", division: "Bhagalpur", state: "Bihar", lat: 24.8000, lng: 87.0167, popular: true, keywords: ["mandar hill", "bounsi", "ropeway", "samudra manthan", "jain tirth"], tag: "Historic Mandar Hill Ropeway & Jain Tirth", tollEst: 195 },

  // ============================================================================
  // 26. MUNGER DISTRICT
  // ============================================================================
  { id: "munger", name: "Munger", hindiName: "मुंगेर", type: "district", typeLabel: "District HQ", district: "Munger", districtId: "munger", division: "Munger", state: "Bihar", lat: 25.3757, lng: 86.4744, popular: true, keywords: ["munger", "bihar school of yoga", "fort", "ganga bridge", "gun factory"], tag: "Bihar School of Yoga & Historic Fort", airport: "Patna / Deoghar Airport", tollEst: 155 },
  { id: "jamalpur", name: "Jamalpur", hindiName: "जमालपुर", type: "town", typeLabel: "Railway Hub", district: "Munger", districtId: "munger", division: "Munger", state: "Bihar", lat: 25.3167, lng: 86.5000, popular: true, keywords: ["jamalpur", "railway workshop", "irimee", "locomotive"], tag: "Asia's Oldest Indian Railway Locomotive Workshop", tollEst: 160 },
  { id: "haveli-kharagpur", name: "Haveli Kharagpur", hindiName: "हवेली खड़गपुर", type: "subdivision", typeLabel: "Sub-Division", district: "Munger", districtId: "munger", division: "Munger", state: "Bihar", lat: 25.1167, lng: 86.5500, popular: false, keywords: ["kharagpur", "lake", "subdivision"], tag: "Scenic Kharagpur Lake Eco-Reserve", tollEst: 170 },

  // ============================================================================
  // 27. BEGUSARAI DISTRICT
  // ============================================================================
  { id: "begusarai", name: "Begusarai", hindiName: "बेगूसराय", type: "district", typeLabel: "District HQ", district: "Begusarai", districtId: "begusarai", division: "Munger", state: "Bihar", lat: 25.4182, lng: 86.1272, popular: true, keywords: ["begusarai", "industrial capital", "refinery", "dinkar", "kanwar lake"], tag: "Industrial Capital of Bihar & Kanwar Lake", airport: "Patna Airport", tollEst: 110 },
  { id: "barauni", name: "Barauni", hindiName: "बरौनी", type: "town", typeLabel: "Industrial Hub", district: "Begusarai", districtId: "begusarai", division: "Munger", state: "Bihar", lat: 25.4667, lng: 85.9667, popular: true, keywords: ["barauni", "refinery", "fertilizer", "thermal power", "railway junction"], tag: "IOCL Oil Refinery & Major Railway Junction", tollEst: 100 },

  // ============================================================================
  // 28. KHAGARIA DISTRICT
  // ============================================================================
  { id: "khagaria", name: "Khagaria", hindiName: "खगड़िया", type: "district", typeLabel: "District HQ", district: "Khagaria", districtId: "khagaria", division: "Munger", state: "Bihar", lat: 25.5036, lng: 86.4828, popular: false, keywords: ["khagaria", "confluence of 7 rivers", "maize hub"], tag: "Land of Seven Rivers & Major Maize Market", airport: "Darbhanga / Patna Airport", tollEst: 140 },
  { id: "gogri-jamalpur", name: "Gogri Jamalpur", hindiName: "गोगरी जमालपुर", type: "subdivision", typeLabel: "Sub-Division", district: "Khagaria", districtId: "khagaria", division: "Munger", state: "Bihar", lat: 25.4167, lng: 86.6000, popular: false, keywords: ["gogri", "subdivision"], tag: "Ganga-Kosi Confluence Agriculture Center", tollEst: 155 },

  // ============================================================================
  // 29. JAMUI DISTRICT
  // ============================================================================
  { id: "jamui", name: "Jamui", hindiName: "जमुई", type: "district", typeLabel: "District HQ", district: "Jamui", districtId: "jamui", division: "Munger", state: "Bihar", lat: 24.9211, lng: 86.2256, popular: false, keywords: ["jamui", "mahavira nirvana", "jain", "gold reserve"], tag: "Jain Tirthankar Mahavira Sacred Land", airport: "Deoghar Airport", tollEst: 160 },
  { id: "jhajha", name: "Jhajha", hindiName: "झाझा", type: "subdivision", typeLabel: "Sub-Division", district: "Jamui", districtId: "jamui", division: "Munger", state: "Bihar", lat: 24.7667, lng: 86.3833, popular: true, keywords: ["jhajha", "railway junction", "main line", "subdivision"], tag: "Major Howrah-Delhi Mainline Railway Junction", tollEst: 175 },

  // ============================================================================
  // 30. LAKHISARAI DISTRICT
  // ============================================================================
  { id: "lakhisarai", name: "Lakhisarai", hindiName: "लखीसराय", type: "district", typeLabel: "District HQ", district: "Lakhisarai", districtId: "lakhisarai", division: "Munger", state: "Bihar", lat: 25.1764, lng: 85.9056, popular: false, keywords: ["lakhisarai", "kiul junction", "buddhist monasteries", "ashringi"], tag: "Kiul Railway Junction & Buddhist Heritage", airport: "Patna Airport", tollEst: 105 },
  { id: "barahiya", name: "Barahiya", hindiName: "बड़हिया", type: "subdivision", typeLabel: "Sub-Division", district: "Lakhisarai", districtId: "lakhisarai", division: "Munger", state: "Bihar", lat: 25.2833, lng: 86.0333, popular: false, keywords: ["barahiya", "famous rasgulla", "maharani mandir", "subdivision"], tag: "Famous Barahiya Rasgulla & Maharani Mandir", tollEst: 95 },

  // ============================================================================
  // 31. SHEIKHPURA DISTRICT
  // ============================================================================
  { id: "sheikhpura", name: "Sheikhpura", hindiName: "शेखपुरा", type: "district", typeLabel: "District HQ", district: "Sheikhpura", districtId: "sheikhpura", division: "Munger", state: "Bihar", lat: 25.1333, lng: 85.8500, popular: false, keywords: ["sheikhpura", "girihinda hill", "stone quarries"], tag: "Girihinda Hill & Stone Crushing Industry", airport: "Patna Airport", tollEst: 90 },
  { id: "barbigha", name: "Barbigha", hindiName: "बरबीघा", type: "town", typeLabel: "Town", district: "Sheikhpura", districtId: "sheikhpura", division: "Munger", state: "Bihar", lat: 25.2333, lng: 85.7333, popular: false, keywords: ["barbigha", "srikrishna singh", "education center"], tag: "Birthplace of Bihar First CM Dr. Srikrishna Singh", tollEst: 80 },

  // ============================================================================
  // 32. PURNIA DISTRICT
  // ============================================================================
  { id: "purnia", name: "Purnia", hindiName: "पूर्णिया", type: "district", typeLabel: "District HQ", district: "Purnia", districtId: "purnia", division: "Purnia", state: "Bihar", lat: 25.7771, lng: 87.4753, popular: true, keywords: ["purnia", "seemanchal", "medical hub", "line bazar", "makhana"], tag: "Heart of Seemanchal & Premier Medical Hub", airport: "Bagdogra / Darbhanga Airport", tollEst: 230 },
  { id: "banmankhi", name: "Banmankhi", hindiName: "बनमनखी", type: "subdivision", typeLabel: "Sub-Division", district: "Purnia", districtId: "purnia", division: "Purnia", state: "Bihar", lat: 25.9000, lng: 87.1667, popular: false, keywords: ["banmankhi", "sugar mill", "prahlad stambh", "subdivision"], tag: "Prahlad Stambh & Sugar Mill Center", tollEst: 215 },
  { id: "baisi", name: "Baisi", hindiName: "बायसी", type: "subdivision", typeLabel: "Sub-Division", district: "Purnia", districtId: "purnia", division: "Purnia", state: "Bihar", lat: 25.8333, lng: 87.7333, popular: false, keywords: ["baisi", "nh31", "mahananda", "subdivision"], tag: "Mahananda River NH-31 Gateway to Bengal", tollEst: 245 },

  // ============================================================================
  // 33. KATIHAR DISTRICT
  // ============================================================================
  { id: "katihar", name: "Katihar", hindiName: "कटिहार", type: "district", typeLabel: "District HQ", district: "Katihar", districtId: "katihar", division: "Purnia", state: "Bihar", lat: 25.5394, lng: 87.5706, popular: true, keywords: ["katihar", "railway division", "nfr", "jute mills"], tag: "Northeast Frontier Railway Division & Jute Hub", airport: "Bagdogra Airport", tollEst: 240 },
  { id: "barsoi", name: "Barsoi", hindiName: "बारसोई", type: "subdivision", typeLabel: "Sub-Division", district: "Katihar", districtId: "katihar", division: "Purnia", state: "Bihar", lat: 25.6833, lng: 87.8833, popular: false, keywords: ["barsoi", "railway junction", "subdivision"], tag: "Major Railway Junction to North East", tollEst: 260 },
  { id: "manihari", name: "Manihari", hindiName: "मनिहारी", type: "subdivision", typeLabel: "Sub-Division", district: "Katihar", districtId: "katihar", division: "Purnia", state: "Bihar", lat: 25.3500, lng: 87.6333, popular: false, keywords: ["manihari", "ganga ferry to sahibganj", "subdivision"], tag: "Ganga Port & Ferry to Sahibganj Jharkhand", tollEst: 255 },

  // ============================================================================
  // 34. ARARIA DISTRICT
  // ============================================================================
  { id: "araria", name: "Araria", hindiName: "अररिया", type: "district", typeLabel: "District HQ", district: "Araria", districtId: "araria", division: "Purnia", state: "Bihar", lat: 26.1500, lng: 87.5200, popular: false, keywords: ["araria", "renu", "nh27"], tag: "Phanishwar Nath Renu Land & NH-27 Corridor", airport: "Bagdogra Airport", tollEst: 260 },
  { id: "forbesganj", name: "Forbesganj", hindiName: "फारबिसगंज", type: "subdivision", typeLabel: "Sub-Division", district: "Araria", districtId: "araria", division: "Purnia", state: "Bihar", lat: 26.3000, lng: 87.2667, popular: true, keywords: ["forbesganj", "business hub", "nh27", "subdivision"], tag: "Premier North Bihar Trade & Commercial City", tollEst: 250 },
  { id: "jogbani", name: "Jogbani (Nepal Gate)", hindiName: "जोगबनी (नेपाल सीमा)", type: "town", typeLabel: "Border Port", district: "Araria", districtId: "araria", division: "Purnia", state: "Bihar", lat: 26.4167, lng: 87.2833, popular: true, keywords: ["jogbani", "biratnagar", "nepal border", "icp customs"], tag: "Indo-Nepal Biratnagar Border Integrated Checkpost", tollEst: 265 },

  // ============================================================================
  // 35. KISHANGANJ DISTRICT
  // ============================================================================
  { id: "kishanganj", name: "Kishanganj", hindiName: "किशनगंज", type: "district", typeLabel: "District HQ", district: "Kishanganj", districtId: "kishanganj", division: "Purnia", state: "Bihar", lat: 26.0969, lng: 87.9439, popular: true, keywords: ["kishanganj", "tea gardens", "chicken neck", "siliguri corridor"], tag: "Tea Plantations & Chicken's Neck Gateway", airport: "Bagdogra Airport (IXB)", tollEst: 290 },
  { id: "thakurganj", name: "Thakurganj", hindiName: "ठाकुरगंज", type: "town", typeLabel: "Town", district: "Kishanganj", districtId: "kishanganj", division: "Purnia", state: "Bihar", lat: 26.4500, lng: 88.1333, popular: false, keywords: ["thakurganj", "tea gardens", "nepal border road"], tag: "Tea Estates & Bengal-Nepal Border Corridor", tollEst: 310 },

  // ============================================================================
  // 36. SAHARSA DISTRICT
  // ============================================================================
  { id: "saharsa", name: "Saharsa", hindiName: "सहरसा", type: "district", typeLabel: "District HQ", district: "Saharsa", districtId: "saharsa", division: "Kosi", state: "Bihar", lat: 25.8833, lng: 86.6000, popular: true, keywords: ["saharsa", "kosi division", "matsyagandha", "tara mandir"], tag: "Kosi Division Seat & Matsyagandha Lake", airport: "Darbhanga Airport", tollEst: 175 },
  { id: "simri-bakhtiarpur", name: "Simri Bakhtiarpur", hindiName: "सिमरी बख्तियारपुर", type: "subdivision", typeLabel: "Sub-Division", district: "Saharsa", districtId: "saharsa", division: "Kosi", state: "Bihar", lat: 25.7167, lng: 86.5833, popular: false, keywords: ["simri bakhtiarpur", "subdivision"], tag: "Historic Estate & Agricultural Trading Center", tollEst: 165 },
  { id: "mahishi", name: "Mahishi (Ugra Tara)", hindiName: "महिषी (उग्रतारा मंदिर)", type: "town", typeLabel: "Pilgrimage Center", district: "Saharsa", districtId: "saharsa", division: "Kosi", state: "Bihar", lat: 25.9500, lng: 86.4667, popular: false, keywords: ["mahishi", "ugra tara mandir", "mandan mishra shastrarth"], tag: "Mata Ugra Tara Mandir & Mandan Mishra Sthan", tollEst: 170 },

  // ============================================================================
  // 37. SUPAUL DISTRICT
  // ============================================================================
  { id: "supaul", name: "Supaul", hindiName: "सुपौल", type: "district", typeLabel: "District HQ", district: "Supaul", districtId: "supaul", division: "Kosi", state: "Bihar", lat: 26.1261, lng: 86.6053, popular: false, keywords: ["supaul", "kosi river", "barrage"], tag: "Kosi River Corridor & Agricultural District", airport: "Darbhanga Airport", tollEst: 190 },
  { id: "birpur", name: "Birpur (Kosi Barrage)", hindiName: "बीरपुर (कोसी बैराज)", type: "subdivision", typeLabel: "Sub-Division", district: "Supaul", districtId: "supaul", division: "Kosi", state: "Bihar", lat: 26.5167, lng: 87.0167, popular: false, keywords: ["birpur", "kosi barrage", "nepal border", "subdivision"], tag: "Historic Indo-Nepal Kosi River Control Barrage", tollEst: 230 },
  { id: "nirmali", name: "Nirmali", hindiName: "निर्मली", type: "subdivision", typeLabel: "Sub-Division", district: "Supaul", districtId: "supaul", division: "Kosi", state: "Bihar", lat: 26.3167, lng: 86.6000, popular: false, keywords: ["nirmali", "kosi mega bridge", "subdivision"], tag: "New Kosi Mega Rail Bridge Connection", tollEst: 195 },

  // ============================================================================
  // 38. MADHEPURA DISTRICT
  // ============================================================================
  { id: "madhepura", name: "Madhepura", hindiName: "मधेपुरा", type: "district", typeLabel: "District HQ", district: "Madhepura", districtId: "madhepura", division: "Kosi", state: "Bihar", lat: 25.9264, lng: 86.7936, popular: false, keywords: ["madhepura", "alstom locomotive", "electric engine", "singheshwar"], tag: "Alstom Electric Locomotive Factory & University", airport: "Darbhanga Airport", tollEst: 185 },
  { id: "singheshwar", name: "Singheshwar Asthan", hindiName: "सिंहेश्वर अस्थान", type: "town", typeLabel: "Pilgrimage Center", district: "Madhepura", districtId: "madhepura", division: "Kosi", state: "Bihar", lat: 26.0167, lng: 86.8167, popular: true, keywords: ["singheshwar", "shiva dham", "maha shivratri mela"], tag: "Sacred Ancient Singheshwar Mahadev Mandir", tollEst: 195 },
  { id: "uda-kishanganj", name: "Uda Kishanganj", hindiName: "उदाकिशुनगंज", type: "subdivision", typeLabel: "Sub-Division", district: "Madhepura", districtId: "madhepura", division: "Kosi", state: "Bihar", lat: 25.6833, lng: 86.9667, popular: false, keywords: ["uda kishanganj", "subdivision"], tag: "Southern Madhepura Agricultural Market", tollEst: 180 },

  // ============================================================================
  // 39. MAJOR CONNECTED OUTSTATION HUBS (PAN-INDIA DIRECT HIGHWAY ROUTES)
  // ============================================================================
  { id: "varanasi", name: "Varanasi (Kashi)", hindiName: "वाराणसी (काशी)", type: "outstation", typeLabel: "Outstation Express", district: "Varanasi", districtId: "varanasi", division: "Outstation", state: "Uttar Pradesh", lat: 25.3176, lng: 82.9739, popular: true, keywords: ["varanasi", "kashi", "banaras", "kashi vishwanath", "assighat", "cantt", "airport"], tag: "Kashi Vishwanath Corridor & Airport", airport: "Lal Bahadur Shastri International (VNS)", tollEst: 280 },
  { id: "kolkata", name: "Kolkata (Howrah)", hindiName: "कोलकाता (हावड़ा)", type: "outstation", typeLabel: "Outstation Express", district: "Kolkata", districtId: "kolkata", division: "Outstation", state: "West Bengal", lat: 22.5726, lng: 88.3639, popular: true, keywords: ["kolkata", "calcutta", "howrah", "airport", "metro"], tag: "Metro Gateway to East & Netaji Airport", airport: "Netaji Subhash Chandra Bose (CCU)", tollEst: 580 },
  { id: "ranchi", name: "Ranchi", hindiName: "राँची", type: "outstation", typeLabel: "Outstation Express", district: "Ranchi", districtId: "ranchi", division: "Outstation", state: "Jharkhand", lat: 23.3441, lng: 85.3096, popular: true, keywords: ["ranchi", "jharkhand", "capital", "waterfalls", "birsa munda"], tag: "Capital of Jharkhand & Birsa Munda Airport", airport: "Birsa Munda Airport (IXR)", tollEst: 320 },
  { id: "deoghar", name: "Deoghar (Baidyanath Dham)", hindiName: "देवघर (बाबा बैद्यनाथ धाम)", type: "outstation", typeLabel: "Outstation Express", district: "Deoghar", districtId: "deoghar", division: "Outstation", state: "Jharkhand", lat: 24.4826, lng: 86.7001, popular: true, keywords: ["deoghar", "baidyanath dham", "jyotirlinga", "airport", "shravani mela"], tag: "12 Jyotirlinga Sacred Dham & Airport", airport: "Deoghar Airport (DGH)", tollEst: 210 },
  { id: "siliguri", name: "Siliguri / Bagdogra", hindiName: "सिलीगुड़ी / बागडोगरा", type: "outstation", typeLabel: "Outstation Express", district: "Darjeeling", districtId: "siliguri", division: "Outstation", state: "West Bengal", lat: 26.7271, lng: 88.3953, popular: true, keywords: ["siliguri", "bagdogra", "darjeeling", "north east gateway", "airport"], tag: "North East & Darjeeling Hills Gateway Airport", airport: "Bagdogra Airport (IXB)", tollEst: 450 },
  { id: "gorakhpur", name: "Gorakhpur", hindiName: "गोरखपुर", type: "outstation", typeLabel: "Outstation Express", district: "Gorakhpur", districtId: "gorakhpur", division: "Outstation", state: "Uttar Pradesh", lat: 26.7606, lng: 83.3732, popular: true, keywords: ["gorakhpur", "gorakhnath temple", "airport", "nepal gateway"], tag: "Gorakhnath Temple & Eastern UP Hub", airport: "Gorakhpur Airport (GOP)", tollEst: 240 },
  { id: "lucknow", name: "Lucknow", hindiName: "लखनऊ", type: "outstation", typeLabel: "Outstation Express", district: "Lucknow", districtId: "lucknow", division: "Outstation", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462, popular: true, keywords: ["lucknow", "purvanchal expressway", "airport", "up capital"], tag: "Purvanchal Expressway Direct Corridor", airport: "Chaudhary Charan Singh (LKO)", tollEst: 520 },
  { id: "delhi", name: "Delhi NCR", hindiName: "दिल्ली एनसीआर", type: "outstation", typeLabel: "Outstation Express", district: "Delhi", districtId: "delhi", division: "Outstation", state: "Delhi", lat: 28.6139, lng: 77.2090, popular: true, keywords: ["delhi", "noida", "gurgaon", "ncr", "national capital"], tag: "National Capital Expressway Network", airport: "Indira Gandhi International (DEL)", tollEst: 950 },
  { id: "dhanbad", name: "Dhanbad", hindiName: "धनबाद", type: "outstation", typeLabel: "Outstation Express", district: "Dhanbad", districtId: "dhanbad", division: "Outstation", state: "Jharkhand", lat: 23.7957, lng: 86.4304, popular: false, keywords: ["dhanbad", "coal capital", "iit ism"], tag: "Coal Capital of India & Grand Trunk Road", tollEst: 280 },
  { id: "jamshedpur", name: "Jamshedpur (Tatanagar)", hindiName: "जमशेदपुर (टाटानगर)", type: "outstation", typeLabel: "Outstation Express", district: "East Singhbhum", districtId: "jamshedpur", division: "Outstation", state: "Jharkhand", lat: 22.8046, lng: 86.2029, popular: false, keywords: ["jamshedpur", "tatanagar", "steel city", "tata"], tag: "Steel City & Industrial Metropolis", tollEst: 360 },
  { id: "bokaro", name: "Bokaro Steel City", hindiName: "बोकारो स्टील सिटी", type: "outstation", typeLabel: "Outstation Express", district: "Bokaro", districtId: "bokaro", division: "Outstation", state: "Jharkhand", lat: 23.6693, lng: 86.1511, popular: false, keywords: ["bokaro", "steel plant", "sail"], tag: "Major Steel Industrial Center", tollEst: 290 }
];

// Alias for backwards compatibility
const BIHAR_DISTRICTS = OTB_CITIES;

// 2. High-Demand OneWayTaxiBihar Intercity & Outstation Routes
const OTB_POPULAR_ROUTES = [
  {
    id: "patna-gaya",
    from: "Patna",
    to: "Gaya (Bodh Gaya)",
    fromId: "patna",
    toId: "gaya",
    distanceKm: 104,
    duration: "2h 15m",
    highway: "NH-22 (Patna-Gaya 4-lane Highway)",
    toll: 110,
    baseFareSedan: 2998,
    baseFareHatchback: 2498,
    baseFareSuv: 4398,
    savingsVsReturnCab: 3200,
    tripsDone: "1,15,000+",
    featured: true
  },
  {
    id: "patna-muzaffarpur",
    from: "Patna",
    to: "Muzaffarpur",
    fromId: "patna",
    toId: "muzaffarpur",
    distanceKm: 78,
    duration: "1h 45m",
    highway: "NH-22 via JP Setu / Hajipur",
    toll: 85,
    baseFareSedan: 2398,
    baseFareHatchback: 1998,
    baseFareSuv: 3598,
    savingsVsReturnCab: 2600,
    tripsDone: "1,40,000+",
    featured: true
  },
  {
    id: "patna-darbhanga",
    from: "Patna",
    to: "Darbhanga",
    fromId: "patna",
    toId: "darbhanga",
    distanceKm: 138,
    duration: "2h 50m",
    highway: "NH-27 / NH-527 via Samastipur",
    toll: 130,
    baseFareSedan: 3598,
    baseFareHatchback: 2998,
    baseFareSuv: 5198,
    savingsVsReturnCab: 3800,
    tripsDone: "88,000+",
    featured: true
  },
  {
    id: "patna-bhagalpur",
    from: "Patna",
    to: "Bhagalpur",
    fromId: "patna",
    toId: "bhagalpur",
    distanceKm: 232,
    duration: "4h 45m",
    highway: "NH-31 & NH-80 via Mokama-Munger",
    toll: 195,
    baseFareSedan: 5198,
    baseFareHatchback: 4398,
    baseFareSuv: 7598,
    savingsVsReturnCab: 5600,
    tripsDone: "62,000+",
    featured: true
  },
  {
    id: "patna-rajgir",
    from: "Patna",
    to: "Nalanda (Bihar Sharif / Rajgir)",
    fromId: "patna",
    toId: "nalanda",
    distanceKm: 75,
    duration: "1h 40m",
    highway: "SH-4 / NH-20 (Bakhtiyarpur-Rajgir 4-lane)",
    toll: 65,
    baseFareSedan: 2398,
    baseFareHatchback: 1998,
    baseFareSuv: 3598,
    savingsVsReturnCab: 2800,
    tripsDone: "95,000+",
    featured: true
  },
  {
    id: "patna-varanasi",
    from: "Patna",
    to: "Varanasi (Kashi)",
    fromId: "patna",
    toId: "varanasi",
    distanceKm: 245,
    duration: "4h 30m",
    highway: "NH-19 / Purvanchal Connector via Mohania",
    toll: 280,
    baseFareSedan: 5598,
    baseFareHatchback: 4798,
    baseFareSuv: 7998,
    savingsVsReturnCab: 6000,
    tripsDone: "72,000+",
    featured: true
  },
  {
    id: "patna-deoghar",
    from: "Patna",
    to: "Deoghar (Baba Baidyanath)",
    fromId: "patna",
    toId: "deoghar",
    distanceKm: 255,
    duration: "5h 15m",
    highway: "SH-82 / NH-333 via Jamui-Chakai",
    toll: 210,
    baseFareSedan: 5998,
    baseFareHatchback: 5198,
    baseFareSuv: 8598,
    savingsVsReturnCab: 6400,
    tripsDone: "54,000+",
    featured: true
  },
  {
    id: "patna-ranchi",
    from: "Patna",
    to: "Ranchi",
    fromId: "patna",
    toId: "ranchi",
    distanceKm: 320,
    duration: "6h 15m",
    highway: "NH-22 & NH-20 (Patna-Ranchi Expressway)",
    toll: 320,
    baseFareSedan: 6998,
    baseFareHatchback: 5998,
    baseFareSuv: 9998,
    savingsVsReturnCab: 7600,
    tripsDone: "48,000+",
    featured: true
  },
  {
    id: "patna-purnia",
    from: "Patna",
    to: "Purnia",
    fromId: "patna",
    toId: "purnia",
    distanceKm: 295,
    duration: "5h 45m",
    highway: "NH-31 (East-West Highway via Begusarai-Khagaria)",
    toll: 230,
    baseFareSedan: 6598,
    baseFareHatchback: 5598,
    baseFareSuv: 9398,
    savingsVsReturnCab: 7000,
    tripsDone: "39,000+",
    featured: false
  },
  {
    id: "patna-motihari",
    from: "Patna",
    to: "East Champaran (Motihari)",
    fromId: "patna",
    toId: "east-champaran",
    distanceKm: 152,
    duration: "3h 10m",
    highway: "NH-22 & NH-27 via Muzaffarpur Bypass",
    toll: 135,
    baseFareSedan: 3798,
    baseFareHatchback: 3198,
    baseFareSuv: 5598,
    savingsVsReturnCab: 4200,
    tripsDone: "44,000+",
    featured: false
  },
  {
    id: "patna-sasaram",
    from: "Patna",
    to: "Rohtas (Sasaram)",
    fromId: "patna",
    toId: "rohtas",
    distanceKm: 155,
    duration: "3h 20m",
    highway: "NH-119 / SH-15 via Ara-Bikramganj",
    toll: 140,
    baseFareSedan: 3798,
    baseFareHatchback: 3198,
    baseFareSuv: 5598,
    savingsVsReturnCab: 4000,
    tripsDone: "36,000+",
    featured: false
  },
  {
    id: "patna-buxar",
    from: "Patna",
    to: "Buxar",
    fromId: "patna",
    toId: "buxar",
    distanceKm: 130,
    duration: "2h 45m",
    highway: "NH-922 (Patna-Buxar 4-lane Expressway)",
    toll: 110,
    baseFareSedan: 3398,
    baseFareHatchback: 2798,
    baseFareSuv: 4998,
    savingsVsReturnCab: 3600,
    tripsDone: "51,000+",
    featured: false
  }
];

// 3. OneWayTaxiBihar Fleet Categories & Pricing Structure
const OTB_FLEET = [
  {
    id: "hatchback",
    category: "Go Hatchback",
    badge: "Budget Outstation",
    models: "WagonR, Tiago, Celerio or similar",
    seats: 4,
    luggage: "2 Large Bags",
    ac: "100% AC Guaranteed",
    ratePerKm: 21.0,
    baseFareMultiplier: 1.0,
    rating: 4.3,
    reviewsCount: "850+",
    features: ["Deep Sanitized Hatchback", "Air Conditioned", "Verified Highway Captain", "Luggage Boot"],
    description: "Economical AC ride for up to 4 passengers with light luggage across all districts."
  },
  {
    id: "sedan",
    category: "Prime Sedan",
    badge: "Most Popular in Bihar",
    models: "Dzire, Etios, Amaze or similar",
    seats: 4,
    luggage: "3-4 Bags (Large Boot)",
    ac: "Chilled AC",
    ratePerKm: 25.0,
    baseFareMultiplier: 1.18,
    rating: 4.3,
    reviewsCount: "1,250+",
    features: ["Spacious Legroom", "Spacious Boot for Heavy Bags", "Highway Cruise Control", "Mobile Charging"],
    description: "The gold standard for family visits, marriage trips, and business travel between Patna and districts."
  },
  {
    id: "sedan_prime",
    category: "Executive Sedan",
    badge: "Executive Comfort",
    models: "Honda City, Ciaz or similar",
    seats: 4,
    luggage: "4 Bags",
    ac: "Climate Controlled AC",
    ratePerKm: 29.0,
    baseFareMultiplier: 1.35,
    rating: 4.3,
    reviewsCount: "350+",
    features: ["Luxury Leather Seating", "Top-Rated Senior Captain", "Mineral Water Bottles", "Quiet Cabin"],
    description: "Premium sedan for executives, VIP delegates, and long highway journeys."
  },
  {
    id: "suv",
    category: "Family SUV (6+1)",
    badge: "Best for Family & Pilgrimage",
    models: "Maruti Ertiga, Kia Carens, Triber",
    seats: 6,
    luggage: "5-6 Bags + Roof Carrier",
    ac: "Dual AC Row Blowers",
    ratePerKm: 33.0,
    baseFareMultiplier: 1.55,
    rating: 4.3,
    reviewsCount: "420+",
    features: ["6 Passenger Capacity", "Roof Carrier for Chhath/Wedding Luggage", "Dual AC Blowers", "High Ground Clearance"],
    description: "Spacious multi-seater ideal for joint families travelling to Bodh Gaya, Rajgir, Deoghar, or village homes."
  },
  {
    id: "innova_crysta",
    category: "Toyota Innova Crysta",
    badge: "VIP Luxury",
    models: "Toyota Innova Crysta",
    seats: 7,
    luggage: "6-7 Large Bags",
    ac: "Triple Row Climate AC",
    ratePerKm: 44.0,
    baseFareMultiplier: 2.1,
    rating: 4.3,
    reviewsCount: "180+",
    features: ["Captain Recliner Chairs", "Supreme Highway Stability", "VIP Highway Protocol", "Senior Highway Expert Captain"],
    description: "Top-tier outstation travel experience with maximum comfort and safety across Bihar highways."
  }
];

// 4. Hourly / Local Rental Packages for Patna & Major Bihar Cities
const OTB_LOCAL_PACKAGES = [
  { id: "pkg_4hr_40km", name: "4 Hours / 40 KM (Patna City Tour)", hours: 4, km: 40, baseSedan: 2398, baseHatch: 1998, baseSuv: 3598, extraKmRate: 24, extraHourRate: 300 },
  { id: "pkg_8hr_80km", name: "8 Hours / 80 KM (Full Day Darshan)", hours: 8, km: 80, baseSedan: 3998, baseHatch: 3398, baseSuv: 5798, extraKmRate: 24, extraHourRate: 300 },
  { id: "pkg_12hr_120km", name: "12 Hours / 120 KM (Extended Tour)", hours: 12, km: 120, baseSedan: 5598, baseHatch: 4798, baseSuv: 7998, extraKmRate: 24, extraHourRate: 300 }
];

// 5. Authentic Verified Passenger Reviews & Ratings for OneWayTaxiBihar (1.0 - 5.0 Star Feedback)
const OTB_PASSENGER_REVIEWS = [
  {
    id: "otb_rev_01",
    initials: "RK",
    name: "Rajeshwar Kumar",
    avatarBg: "#059669",
    city: "Patna",
    route: "Patna → Bodh Gaya",
    car: "Prime Sedan (Dzire)",
    rating: 4.5,
    badge: "Verified Outstation Trip",
    verified: true,
    comment: "Booked Dzire from Patna Junction to Bodh Gaya for family pilgrimage. Clean AC cab, driver reached 15 mins before time. Charged exactly ₹2,998 with toll included. Zero return fare!"
  },
  {
    id: "otb_rev_02",
    initials: "SV",
    name: "Dr. Sneha Verma",
    avatarBg: "#2563eb",
    city: "Muzaffarpur",
    route: "Patna Airport → Muzaffarpur",
    car: "Go Hatchback (WagonR)",
    rating: 4.8,
    badge: "Verified Airport Transfer",
    verified: true,
    comment: "Flight landed late at Patna Airport. OneWayTaxiBihar captain was waiting outside with AC already on. Smooth driving over Gandhi Setu and reached safely."
  },
  {
    id: "otb_rev_03",
    initials: "AS",
    name: "Alok Sinha",
    avatarBg: "#7c3aed",
    city: "Darbhanga",
    route: "Patna → Darbhanga",
    car: "Family SUV (Ertiga)",
    rating: 4.3,
    badge: "Verified Family Booking",
    verified: true,
    comment: "Travelled with 5 family members and heavy luggage for festival. Ertiga had roof carrier and the driver knew the newly widened expressway route. Saved ₹3,800!"
  },
  {
    id: "otb_rev_04",
    initials: "MP",
    name: "Manish Pandey",
    avatarBg: "#d97706",
    city: "Bhagalpur",
    route: "Patna → Bhagalpur",
    car: "Prime Sedan (Etios)",
    rating: 4.6,
    badge: "Verified Intercity Ride",
    verified: true,
    comment: "Excellent highway cruise via Mokama. Transparent fixed pricing with zero hidden charges. OneWayTaxiBihar is our first choice for monthly district travel."
  },
  {
    id: "otb_rev_05",
    initials: "AA",
    name: "Amit Anand",
    avatarBg: "#64748b",
    city: "Purnia",
    route: "Patna → Purnia",
    car: "Prime Sedan (Dzire)",
    rating: 3.5,
    badge: "Verified Highway Trip",
    verified: true,
    comment: "Punctual pickup from Kankarbagh and honest pricing with toll included. However AC cooling was moderate during peak afternoon heat. Overall decent service."
  },
  {
    id: "otb_rev_06",
    initials: "PJ",
    name: "Pooja Jha",
    avatarBg: "#db2777",
    city: "Madhubani",
    route: "Patna → Madhubani",
    car: "Innova Crysta",
    rating: 4.7,
    badge: "Verified Outstation Booking",
    verified: true,
    comment: "Booked Innova Crysta for wedding travel. Super comfortable captain seats and peaceful driving. 24x7 helpdesk +91 72818 51011 is very responsive."
  },
  {
    id: "otb_rev_07",
    initials: "DC",
    name: "Deepak Choudhary",
    avatarBg: "#f59e0b",
    city: "Saran",
    route: "Patna → Chhapra",
    car: "Go Hatchback",
    rating: 3.0,
    badge: "Verified Outstation Ride",
    verified: true,
    comment: "Driver was delayed by 10 mins due to traffic jam near Digha, but informed beforehand. Highway driving was safe and fixed fare policy was honored without extra charges."
  },
  {
    id: "otb_rev_08",
    initials: "VK",
    name: "Vikash Kashyap",
    avatarBg: "#0284c7",
    city: "Nalanda",
    route: "Patna → Rajgir Glass Bridge",
    car: "Prime Sedan (Dzire)",
    rating: 4.4,
    badge: "Verified Pilgrimage Trip",
    verified: true,
    comment: "Weekend tour to Rajgir Nature Safari and Vishwa Shanti Stupa. Driver guided us through scenic Bakhtiyarpur-Rajgir 4-lane. Seamless experience!"
  },
  {
    id: "otb_rev_09",
    initials: "RT",
    name: "Ravi Tiwari",
    avatarBg: "#4f46e5",
    city: "Rohtas",
    route: "Patna → Sasaram",
    car: "Go Hatchback",
    rating: 4.3,
    badge: "Verified Outstation Trip",
    verified: true,
    comment: "Fast, reliable and very economical. Paid only ₹3,198 for a one-way trip to Sasaram. No need to negotiate with offline taxi stands."
  },
  {
    id: "otb_rev_10",
    initials: "SM",
    name: "Saurabh Mishra",
    avatarBg: "#0d9488",
    city: "Varanasi",
    route: "Patna → Varanasi",
    car: "Family SUV (Ertiga)",
    rating: 4.8,
    badge: "Verified Intercity Ride",
    verified: true,
    comment: "Took early morning 5 AM outstation cab from Boring Road Patna to Kashi Vishwanath Temple. Smooth driving and reached in 4.5 hours."
  }
];

const OTB_FRIENDS_REVIEWS = OTB_PASSENGER_REVIEWS;

// 6. The OneWayTaxiBihar Advantage (10 Core Pillars)
const OTB_WHY_CHOOSE_US = [
  {
    num: "01",
    title: "Doorstep Pickup Across All 38 Districts",
    desc: "OneWayTaxiBihar picks you up from your exact home, airport, or railway platform in Patna or any district and drops you gate-to-gate at fixed rates."
  },
  {
    num: "02",
    title: "100% Guaranteed Cab (Zero Cancellation)",
    desc: "Booked an outstation cab? Your ride is 100% confirmed with zero cancellations from our side. On-time doorstep arrival guaranteed."
  },
  {
    num: "03",
    title: "Transparent Fares (Tolls & GST Included)",
    desc: "All highway toll charges, state road taxes, driver allowance, and GST are clearly displayed before booking. Zero hidden cash demands."
  },
  {
    num: "04",
    title: "Zero Cancellation Fee Policy",
    desc: "Plans changed due to train/flight delay or emergency? Cancel your ride anytime with zero cancellation charges and 100% instant refund."
  },
  {
    num: "05",
    title: "24/7 Patna Helpdesk & SOS Assistance",
    desc: "Need immediate assistance or custom route routing? Call our 24/7 Patna central helpline at +91 80021 41816."
  },
  {
    num: "06",
    title: "Police-Verified Highway Captains",
    desc: "All drivers are background-checked, commercially licensed, and verified on 8+ safety, courteous behavior, and smooth driving parameters."
  },
  {
    num: "07",
    title: "Flexible Payment Modes",
    desc: "Pay 100% Cash/UPI to the driver only upon reaching your destination safely, or pay via Google Pay, PhonePe, Paytm, Cards, or Wallet."
  },
  {
    num: "08",
    title: "Diverse & Clean Outstation Fleet",
    desc: "Choose from Hatchback, Dzire/Etios Sedans, Executive Sedans, Ertiga 6-seaters with roof carriers, and luxury Toyota Innova Crysta."
  },
  {
    num: "09",
    title: "Instant Booking via Web & App",
    desc: "Book your one-way taxi in under 30 seconds with instant SMS and WhatsApp ticket dispatch with driver and vehicle plate numbers."
  },
  {
    num: "10",
    title: "100% AC & Sanitized Vehicles",
    desc: "We ensure all fleet cabs are mechanically certified, air-conditioning always working, and cabins deeply cleaned before every journey."
  }
];

// 7. Official Frequently Asked Questions (OneWayTaxiBihar FAQ)
const OTB_FAQS = [
  {
    q: "What is OneWayTaxiBihar and how does one-way pricing work?",
    a: "OneWayTaxiBihar (onewaytaxibihar.com) is Bihar's dedicated intercity one-way cab service. Traditional taxi stands in Patna charge return fares (both ways) even when you travel one-way. OneWayTaxiBihar eliminates dead-mileage charges, saving you up to 50% by charging only for the distance you travel."
  },
  {
    q: "Which districts and cities in Bihar do you cover?",
    a: "We provide doorstep pickup and drop across all 38 districts of Bihar (Patna, Gaya, Muzaffarpur, Bhagalpur, Darbhanga, Nalanda/Rajgir, Vaishali, Purnia, Motihari, Bettiah, Buxar, Sasaram, Begusarai, Samastipur, etc.) as well as connecting outstation routes to Varanasi, Kolkata, Ranchi, Deoghar, and Delhi."
  },
  {
    q: "Are toll taxes and GST included in the fare?",
    a: "Yes! OneWayTaxiBihar offers 100% transparent pricing. The displayed fare includes base cab fare, estimated highway fastag toll charges, driver allowance, and 5% GST. No extra cash demands on the highway."
  },
  {
    q: "Can I book a cab from Patna Airport (PAT) or Patna Junction (PNBE)?",
    a: "Yes! We specialize in airport and railway station pickups 24x7. You can enter your flight or train number during booking, and our captain will track your arrival to ensure zero waiting time."
  },
  {
    q: "I need to cancel my booking. Will I be charged a cancellation penalty?",
    a: "No. OneWayTaxiBihar follows a strict Zero Cancellation Fee policy. We understand that travel schedules can change, so you will never be penalized for cancelling a ride."
  },
  {
    q: "Can I book a multi-day round trip or hourly rental in Patna?",
    a: "Yes. In addition to One-Way drops, we offer Round Trip Outstation (with 12% built-in discount) and Local Hourly Packages (4Hr/40KM, 8Hr/80KM, 12Hr/120KM) for Patna local sightseeing, meetings, and darshan."
  },
  {
    q: "Is it safe for solo women travellers and senior citizens?",
    a: "Absolutely. Passenger safety is our topmost priority. All captains are police-verified, vehicles are GPS-tracked in real-time, and you receive driver details with start OTP and a 24x7 SOS emergency helpline."
  },
  {
    q: "What payment methods are supported?",
    a: "We accept all payment methods: 100% Cash or UPI to driver on arrival, UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, NetBanking, and OTB Wallet balance."
  },
  {
    q: "Can I get an official GST tax invoice for corporate business travel expense claims?",
    a: "Yes. Every booking receives an automated GST tax invoice with company GSTIN and breakdown that you can download or print directly from our 'Request Invoice' portal."
  },
  {
    q: "How do I contact customer support if I need assistance?",
    a: "Our Patna central customer support team is available 24x7. Call our helpline at +91 80021 41816, WhatsApp us at +91 72818 51011, or click the Call button on the website."
  }
];

// 9. Corporate Travel Desk for Bihar Enterprises & Government
const OTB_CORPORATE_DATA = {
  title: "OneWayTaxiBihar for Business & Corporate Travel",
  subtitle: "Streamline outstation employee and executive travel across all 38 districts of Bihar with centralized billing & GST compliance",
  trustedBy: ["Bihar State Tourism Development", "AIIMS Patna", "L&T Construction (Bihar Projects)", "Bajaj Allianz", "HDFC Bank Bihar Hub", "NTPC Barh / Kahalgaon"],
  features: [
    { title: "Consolidated Monthly GST Invoicing", desc: "Monthly statement with automated GST tax credit pass-through for company expenses." },
    { title: "Priority Dispatch in Patna & Districts", desc: "Guaranteed outstation cabs for urgent government, medical, and corporate delegations." },
    { title: "Zero Cancellation Penalty Fees", desc: "Meeting rescheduled? Modify or cancel bookings with zero penalty." },
    { title: "Dedicated Bihar Account Manager", desc: "Single point of contact for corporate rentals, event fleets, and airport transfers." },
    { title: "Real-Time Travel Radar & SOS", desc: "Safety dashboard for company administration to monitor employee travel live." }
  ]
};

// Export to window
if (typeof window !== "undefined") {
  window.OTB_CITIES = OTB_CITIES;
  window.BIHAR_DISTRICTS = BIHAR_DISTRICTS;
  window.OTB_POPULAR_ROUTES = OTB_POPULAR_ROUTES;
  window.OTB_FLEET = OTB_FLEET;
  window.OTB_LOCAL_PACKAGES = OTB_LOCAL_PACKAGES;
  window.OTB_FRIENDS_REVIEWS = OTB_FRIENDS_REVIEWS;
  window.OTB_WHY_CHOOSE_US = OTB_WHY_CHOOSE_US;
  window.OTB_FAQS = OTB_FAQS;
  window.OTB_CORPORATE_DATA = OTB_CORPORATE_DATA;
}
