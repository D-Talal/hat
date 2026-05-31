/**
 * Geographic data — continents, countries, major cities
 * Used for cascading dropdowns: continent → country → city
 */

export const CONTINENTS = [
  "Africa",
  "Asia Pacific",
  "Europe",
  "Middle East",
  "North America",
  "South America",
];

// country → { continent, cities[] }
export const COUNTRIES = {
  // ── AFRICA ──────────────────────────────────────────────────────────────
  "Algeria":         { continent: "Africa",        cities: ["Algiers","Oran","Constantine","Annaba","Blida","Sétif","Tlemcen"] },
  "Angola":          { continent: "Africa",        cities: ["Luanda","Huambo","Lobito","Benguela","Kuito"] },
  "Cameroon":        { continent: "Africa",        cities: ["Douala","Yaoundé","Garoua","Bamenda","Bafoussam"] },
  "Côte d'Ivoire":   { continent: "Africa",        cities: ["Abidjan","Bouaké","Daloa","Korhogo","Yamoussoukro"] },
  "DR Congo":        { continent: "Africa",        cities: ["Kinshasa","Lubumbashi","Mbuji-Mayi","Kananga","Kisangani"] },
  "Egypt":           { continent: "Africa",        cities: ["Cairo","Alexandria","Giza","Shubra El Kheima","Port Said","Suez","Mansoura","Tanta","Assiut","Luxor"] },
  "Ethiopia":        { continent: "Africa",        cities: ["Addis Ababa","Dire Dawa","Mek'ele","Adama","Gondar"] },
  "Ghana":           { continent: "Africa",        cities: ["Accra","Kumasi","Tamale","Sekondi-Takoradi","Ashaiman"] },
  "Kenya":           { continent: "Africa",        cities: ["Nairobi","Mombasa","Nakuru","Eldoret","Kisumu"] },
  "Libya":           { continent: "Africa",        cities: ["Tripoli","Benghazi","Misrata","Tarhuna","Sabha"] },
  "Madagascar":      { continent: "Africa",        cities: ["Antananarivo","Toamasina","Antsirabe","Fianarantsoa"] },
  "Mali":            { continent: "Africa",        cities: ["Bamako","Sikasso","Mopti","Koutiala","Kayes"] },
  "Morocco":         { continent: "Africa",        cities: ["Casablanca","Rabat","Fes","Marrakech","Agadir","Tangier","Meknes","Oujda","Kenitra","Tetouan","El Jadida","Beni Mellal","Nador","Mohammedia","Laayoune"] },
  "Mozambique":      { continent: "Africa",        cities: ["Maputo","Matola","Beira","Nampula","Chimoio"] },
  "Nigeria":         { continent: "Africa",        cities: ["Lagos","Kano","Ibadan","Abuja","Port Harcourt","Benin City","Kaduna","Enugu","Onitsha","Zaria"] },
  "Rwanda":          { continent: "Africa",        cities: ["Kigali","Butare","Gitarama","Musanze"] },
  "Senegal":         { continent: "Africa",        cities: ["Dakar","Thiès","Kaolack","Ziguinchor","Saint-Louis"] },
  "South Africa":    { continent: "Africa",        cities: ["Johannesburg","Cape Town","Durban","Pretoria","Port Elizabeth","Bloemfontein","East London","Nelspruit","Polokwane"] },
  "Tanzania":        { continent: "Africa",        cities: ["Dar es Salaam","Mwanza","Arusha","Dodoma","Mbeya"] },
  "Tunisia":         { continent: "Africa",        cities: ["Tunis","Sfax","Sousse","Kairouan","Bizerte","Gabès","Ariana","Gafsa","Monastir"] },
  "Uganda":          { continent: "Africa",        cities: ["Kampala","Gulu","Lira","Mbarara","Jinja"] },
  "Zimbabwe":        { continent: "Africa",        cities: ["Harare","Bulawayo","Chitungwiza","Mutare","Gweru"] },

  // ── ASIA PACIFIC ─────────────────────────────────────────────────────────
  "Australia":       { continent: "Asia Pacific",  cities: ["Sydney","Melbourne","Brisbane","Perth","Adelaide","Gold Coast","Canberra","Newcastle","Wollongong"] },
  "Bangladesh":      { continent: "Asia Pacific",  cities: ["Dhaka","Chittagong","Sylhet","Rajshahi","Khulna"] },
  "China":           { continent: "Asia Pacific",  cities: ["Shanghai","Beijing","Chongqing","Shenzhen","Guangzhou","Tianjin","Wuhan","Chengdu","Nanjing","Xi'an","Hangzhou","Shenyang","Dongguan","Harbin","Foshan","Kunming"] },
  "India":           { continent: "Asia Pacific",  cities: ["Mumbai","Delhi","Bengaluru","Hyderabad","Ahmedabad","Chennai","Kolkata","Surat","Pune","Jaipur","Lucknow","Kanpur","Nagpur","Visakhapatnam","Indore","Thane","Bhopal"] },
  "Indonesia":       { continent: "Asia Pacific",  cities: ["Jakarta","Surabaya","Bandung","Bekasi","Medan","Semarang","Palembang","Makassar","Depok","Tangerang"] },
  "Japan":           { continent: "Asia Pacific",  cities: ["Tokyo","Yokohama","Osaka","Nagoya","Sapporo","Fukuoka","Kobe","Kyoto","Kawasaki","Saitama","Hiroshima"] },
  "Malaysia":        { continent: "Asia Pacific",  cities: ["Kuala Lumpur","George Town","Ipoh","Shah Alam","Petaling Jaya","Johor Bahru","Kota Kinabalu","Kuching"] },
  "New Zealand":     { continent: "Asia Pacific",  cities: ["Auckland","Wellington","Christchurch","Hamilton","Tauranga","Napier-Hastings","Dunedin"] },
  "Pakistan":        { continent: "Asia Pacific",  cities: ["Karachi","Lahore","Faisalabad","Rawalpindi","Gujranwala","Peshawar","Multan","Islamabad","Hyderabad","Quetta"] },
  "Philippines":     { continent: "Asia Pacific",  cities: ["Manila","Quezon City","Caloocan","Davao","Cebu","Zamboanga","Antipolo","Pasig"] },
  "Singapore":       { continent: "Asia Pacific",  cities: ["Singapore"] },
  "South Korea":     { continent: "Asia Pacific",  cities: ["Seoul","Busan","Incheon","Daegu","Daejeon","Gwangju","Suwon","Ulsan","Changwon","Goyang"] },
  "Sri Lanka":       { continent: "Asia Pacific",  cities: ["Colombo","Kandy","Galle","Jaffna","Batticaloa"] },
  "Taiwan":          { continent: "Asia Pacific",  cities: ["Taipei","Kaohsiung","Taichung","Tainan","Hsinchu","Keelung"] },
  "Thailand":        { continent: "Asia Pacific",  cities: ["Bangkok","Nonthaburi","Pak Kret","Hat Yai","Chiang Mai","Phuket","Pattaya"] },
  "Vietnam":         { continent: "Asia Pacific",  cities: ["Ho Chi Minh City","Hanoi","Haiphong","Da Nang","Biên Hòa","Cần Thơ","Hue","Nha Trang"] },

  // ── EUROPE ───────────────────────────────────────────────────────────────
  "Austria":         { continent: "Europe",        cities: ["Vienna","Graz","Linz","Salzburg","Innsbruck","Klagenfurt"] },
  "Belgium":         { continent: "Europe",        cities: ["Brussels","Antwerp","Ghent","Charleroi","Liège","Bruges","Namur"] },
  "Czech Republic":  { continent: "Europe",        cities: ["Prague","Brno","Ostrava","Pilsen","Liberec","Olomouc"] },
  "Denmark":         { continent: "Europe",        cities: ["Copenhagen","Aarhus","Odense","Aalborg","Frederiksberg"] },
  "Finland":         { continent: "Europe",        cities: ["Helsinki","Espoo","Tampere","Vantaa","Oulu","Turku"] },
  "France":          { continent: "Europe",        cities: ["Paris","Marseille","Lyon","Toulouse","Nice","Nantes","Strasbourg","Montpellier","Bordeaux","Lille","Rennes","Reims","Saint-Étienne","Le Havre","Grenoble"] },
  "Germany":         { continent: "Europe",        cities: ["Berlin","Hamburg","Munich","Cologne","Frankfurt","Stuttgart","Düsseldorf","Leipzig","Dortmund","Essen","Bremen","Dresden","Hannover","Nuremberg"] },
  "Greece":          { continent: "Europe",        cities: ["Athens","Thessaloniki","Patras","Heraklion","Larissa","Volos","Rhodes"] },
  "Hungary":         { continent: "Europe",        cities: ["Budapest","Debrecen","Miskolc","Szeged","Pécs","Győr"] },
  "Ireland":         { continent: "Europe",        cities: ["Dublin","Cork","Limerick","Galway","Waterford","Drogheda"] },
  "Italy":           { continent: "Europe",        cities: ["Rome","Milan","Naples","Turin","Palermo","Genoa","Bologna","Florence","Bari","Catania","Venice","Verona","Messina","Padua","Trieste"] },
  "Netherlands":     { continent: "Europe",        cities: ["Amsterdam","Rotterdam","The Hague","Utrecht","Eindhoven","Tilburg","Groningen","Almere","Breda","Nijmegen"] },
  "Norway":          { continent: "Europe",        cities: ["Oslo","Bergen","Trondheim","Stavanger","Drammen","Fredrikstad"] },
  "Poland":          { continent: "Europe",        cities: ["Warsaw","Kraków","Łódź","Wrocław","Poznań","Gdańsk","Szczecin","Bydgoszcz","Lublin","Katowice"] },
  "Portugal":        { continent: "Europe",        cities: ["Lisbon","Porto","Braga","Coimbra","Funchal","Faro","Setúbal","Almada"] },
  "Romania":         { continent: "Europe",        cities: ["Bucharest","Cluj-Napoca","Timișoara","Iași","Constanța","Craiova","Brașov","Galați"] },
  "Russia":          { continent: "Europe",        cities: ["Moscow","Saint Petersburg","Novosibirsk","Yekaterinburg","Nizhny Novgorod","Kazan","Samara","Omsk","Chelyabinsk","Rostov-on-Don","Ufa","Volgograd","Krasnoyarsk"] },
  "Spain":           { continent: "Europe",        cities: ["Madrid","Barcelona","Valencia","Seville","Zaragoza","Málaga","Murcia","Palma","Las Palmas","Bilbao","Alicante","Córdoba","Valladolid","Vigo","Gijón","Granada"] },
  "Sweden":          { continent: "Europe",        cities: ["Stockholm","Gothenburg","Malmö","Uppsala","Västerås","Örebro","Linköping","Helsingborg","Jönköping"] },
  "Switzerland":     { continent: "Europe",        cities: ["Zurich","Geneva","Basel","Bern","Lausanne","Winterthur","Lucerne","St. Gallen","Lugano"] },
  "Turkey":          { continent: "Europe",        cities: ["Istanbul","Ankara","Izmir","Bursa","Adana","Gaziantep","Konya","Antalya","Kayseri","Mersin","Eskişehir","Diyarbakır","Samsun","Denizli"] },
  "Ukraine":         { continent: "Europe",        cities: ["Kyiv","Kharkiv","Odessa","Dnipro","Donetsk","Zaporizhzhia","Lviv","Kryvyi Rih","Mykolaiv","Mariupol"] },
  "United Kingdom":  { continent: "Europe",        cities: ["London","Birmingham","Manchester","Glasgow","Liverpool","Bristol","Sheffield","Edinburgh","Leeds","Leicester","Coventry","Bradford","Cardiff","Belfast","Nottingham"] },

  // ── MIDDLE EAST ──────────────────────────────────────────────────────────
  "Bahrain":         { continent: "Middle East",   cities: ["Manama","Riffa","Muharraq","Hamad Town","Isa Town"] },
  "Iran":            { continent: "Middle East",   cities: ["Tehran","Mashhad","Isfahan","Karaj","Tabriz","Shiraz","Ahvaz","Qom","Kermanshah","Urmia"] },
  "Iraq":            { continent: "Middle East",   cities: ["Baghdad","Basra","Mosul","Erbil","Kirkuk","Najaf","Karbala","Sulaymaniyah"] },
  "Israel":          { continent: "Middle East",   cities: ["Jerusalem","Tel Aviv","Haifa","Rishon LeZion","Petah Tikva","Ashdod","Netanya","Beer Sheva","Holon","Bnei Brak"] },
  "Jordan":          { continent: "Middle East",   cities: ["Amman","Zarqa","Irbid","Russeifa","Wadi as-Seer","Aqaba"] },
  "Kuwait":          { continent: "Middle East",   cities: ["Kuwait City","Salmiya","Hawalli","Farwaniya","Ahmadi","Jahra"] },
  "Lebanon":         { continent: "Middle East",   cities: ["Beirut","Tripoli","Sidon","Tyre","Jounieh","Zahle"] },
  "Oman":            { continent: "Middle East",   cities: ["Muscat","Seeb","Salalah","Sohar","Nizwa","Sur","Ibra"] },
  "Palestine":       { continent: "Middle East",   cities: ["Gaza","Hebron","Nablus","Ramallah","Jenin","Tulkarm","Bethlehem"] },
  "Qatar":           { continent: "Middle East",   cities: ["Doha","Al Rayyan","Al Wakrah","Al Khor","Madinat ash Shamal"] },
  "Saudi Arabia":    { continent: "Middle East",   cities: ["Riyadh","Jeddah","Mecca","Medina","Dammam","Khobar","Tabuk","Abha","Hail","Buraidah","Najran","Yanbu","Khamis Mushait"] },
  "Syria":           { continent: "Middle East",   cities: ["Damascus","Aleppo","Homs","Latakia","Hama","Deir ez-Zor","Ar-Raqqah","Idlib"] },
  "United Arab Emirates": { continent: "Middle East", cities: ["Dubai","Abu Dhabi","Sharjah","Al Ain","Ajman","Ras Al Khaimah","Fujairah","Umm Al Quwain"] },
  "Yemen":           { continent: "Middle East",   cities: ["Sanaa","Aden","Taiz","Hodeidah","Ibb","Dhamar","Mukalla"] },

  // ── NORTH AMERICA ────────────────────────────────────────────────────────
  "Canada":          { continent: "North America", cities: ["Toronto","Montreal","Vancouver","Calgary","Edmonton","Ottawa","Winnipeg","Quebec City","Hamilton","Kitchener","London","Halifax","Victoria","Windsor","Saskatoon","Regina"] },
  "Costa Rica":      { continent: "North America", cities: ["San José","Alajuela","Desamparados","Cartago","Heredia"] },
  "Cuba":            { continent: "North America", cities: ["Havana","Santiago de Cuba","Camagüey","Holguín","Guantánamo"] },
  "Dominican Republic": { continent: "North America", cities: ["Santo Domingo","Santiago","La Romana","San Pedro de Macorís","La Vega"] },
  "El Salvador":     { continent: "North America", cities: ["San Salvador","Soyapango","Santa Ana","San Miguel","Mejicanos"] },
  "Guatemala":       { continent: "North America", cities: ["Guatemala City","Mixco","Villa Nueva","Petapa","San Juan Sacatepéquez"] },
  "Honduras":        { continent: "North America", cities: ["Tegucigalpa","San Pedro Sula","Choloma","La Ceiba","El Progreso"] },
  "Jamaica":         { continent: "North America", cities: ["Kingston","Spanish Town","Portmore","Montego Bay"] },
  "Mexico":          { continent: "North America", cities: ["Mexico City","Guadalajara","Monterrey","Puebla","Toluca","Tijuana","León","Ciudad Juárez","Torreón","Querétaro","San Luis Potosí","Mérida","Mexicali","Aguascalientes","Cancún"] },
  "Nicaragua":       { continent: "North America", cities: ["Managua","León","Masaya","Tipitapa","Matagalpa"] },
  "Panama":          { continent: "North America", cities: ["Panama City","San Miguelito","Tocumen","David","Colón"] },
  "United States":   { continent: "North America", cities: ["New York","Los Angeles","Chicago","Houston","Phoenix","Philadelphia","San Antonio","San Diego","Dallas","San Jose","Austin","Jacksonville","Fort Worth","Columbus","Charlotte","Indianapolis","San Francisco","Seattle","Denver","Nashville","Oklahoma City","El Paso","Las Vegas","Washington D.C.","Boston","Memphis","Louisville","Portland","Baltimore","Milwaukee","Albuquerque","Tucson","Fresno","Mesa","Sacramento","Atlanta","Kansas City","Miami","Omaha","Colorado Springs","Raleigh","Long Beach","Virginia Beach","Minneapolis","Tampa","New Orleans","Arlington","Bakersfield","Honolulu","Anaheim","Aurora"] },

  // ── SOUTH AMERICA ────────────────────────────────────────────────────────
  "Argentina":       { continent: "South America", cities: ["Buenos Aires","Córdoba","Rosario","Mendoza","Tucumán","La Plata","Mar del Plata","Salta","Santa Fe","San Juan","Resistencia","Santiago del Estero","Corrientes","Neuquén","Posadas"] },
  "Bolivia":         { continent: "South America", cities: ["Santa Cruz de la Sierra","El Alto","Cochabamba","La Paz","Oruro","Sucre","Tarija","Potosí"] },
  "Brazil":          { continent: "South America", cities: ["São Paulo","Rio de Janeiro","Brasília","Salvador","Fortaleza","Belo Horizonte","Manaus","Curitiba","Recife","Porto Alegre","Belém","Goiânia","Guarulhos","Campinas","São Luís","São Gonçalo","Maceió","Duque de Caxias","Natal","Teresina"] },
  "Chile":           { continent: "South America", cities: ["Santiago","Valparaíso","Concepción","La Serena","Antofagasta","Temuco","Rancagua","Talca","Arica","Iquique","Puerto Montt"] },
  "Colombia":        { continent: "South America", cities: ["Bogotá","Medellín","Cali","Barranquilla","Cartagena","Cúcuta","Bucaramanga","Pereira","Santa Marta","Ibagué","Manizales","Pasto"] },
  "Ecuador":         { continent: "South America", cities: ["Guayaquil","Quito","Cuenca","Santo Domingo","Machala","Durán","Manta","Portoviejo","Loja","Ambato"] },
  "Paraguay":        { continent: "South America", cities: ["Asunción","Ciudad del Este","San Lorenzo","Luque","Capiatá","Lambaré"] },
  "Peru":            { continent: "South America", cities: ["Lima","Arequipa","Trujillo","Chiclayo","Piura","Iquitos","Cusco","Huancayo","Tacna","Juliaca","Callao"] },
  "Uruguay":         { continent: "South America", cities: ["Montevideo","Salto","Ciudad de la Costa","Paysandú","Las Piedras","Rivera"] },
  "Venezuela":       { continent: "South America", cities: ["Caracas","Maracaibo","Valencia","Barquisimeto","Ciudad Guayana","Maracay","Barcelona","Maturín","San Cristóbal","Cumaná"] },
};

/** Get sorted list of country names */
export const getCountries = () => Object.keys(COUNTRIES).sort();

/** Get countries for a given continent */
export const getCountriesByContinent = (continent) =>
  Object.entries(COUNTRIES)
    .filter(([, v]) => v.continent === continent)
    .map(([k]) => k)
    .sort();

/** Get cities for a given country */
export const getCities = (country) => COUNTRIES[country]?.cities || [];

/** Get continent for a given country */
export const getContinentForCountry = (country) => COUNTRIES[country]?.continent || '';

/** States/Provinces for US and Canada */
export const STATES = {
  "United States": [
    "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
    "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
    "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
    "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
    "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
    "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
    "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
    "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
    "District of Columbia"
  ],
  "Canada": [
    "Alberta","British Columbia","Manitoba","New Brunswick",
    "Newfoundland and Labrador","Northwest Territories","Nova Scotia","Nunavut",
    "Ontario","Prince Edward Island","Quebec","Saskatchewan","Yukon"
  ],
};

/** Get states/provinces for a given country (returns [] if not applicable) */
export const getStates = (country) => STATES[country] || [];

/** Whether a country has states/provinces */
export const hasStates = (country) => !!STATES[country];
