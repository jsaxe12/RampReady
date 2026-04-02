const now = new Date()
const today = (h, m) => {
  const d = new Date(now)
  d.setHours(h, m, 0, 0)
  return d
}

export const FBO_INFO = {
  fboName: 'Ramp Ready Aviation',
  icao: 'KRRA',
  airportName: 'Ramp Ready Regional Airport',
  hours: '6:00 AM – 10:00 PM CDT',
  servicesOffered: [
    'Full-service fueling',
    'GPU / ground power',
    'De-icing',
    'Hangar storage',
    'Ramp parking',
    'Crew car',
    'Passenger lounge',
    'Catering coordination',
    'Lavatory service',
  ],
}

export const INITIAL_FUEL_PRICES = {
  avgas: 6.45,
  jetA: 5.89,
  lastUpdated: new Date(now.getTime() - 47 * 60 * 1000),
}

// Gill Aviation ramp fee schedule
// Min gallons to waive ramp fee, ramp fee if not met
export const RAMP_FEE_SCHEDULE = [
  {
    category: 'Super Heavy Jet',
    minGallons: 300,
    rampFee: 350,
    aircraft: ['Global Express', 'Gulfstream G-V, G-550, 650'],
  },
  {
    category: 'Heavy Jet',
    minGallons: 200,
    rampFee: 250,
    aircraft: ['Citation X/10/750', 'Citation Sovereign/680', 'Challenger CL-300/600/601/604/605', 'CRJ 200/700/900', 'Embraer 145 Legacy', 'Falcon-50/900/2000', 'Gulfstream G-II/G-III/GIV/G-450', 'G200/Galaxy', 'Jetstar I & II'],
  },
  {
    category: 'Medium Jet',
    minGallons: 150,
    rampFee: 200,
    aircraft: ['Astra/Astra SPX/G-100', 'Citation Excel/560XL', 'Citation III/VI/VII/650', 'Falcon-20/200', 'Hawker HS-125-700/800/1000', 'Learjet LR-40/45/55/60', 'Sabreliner NA-40/60/65/80', 'Westwind WW-1123/24/24 II', 'BOE-234LR/UT Chinook', 'Sikorsky S-92', 'Super Puma AS332', 'Westland EH-101'],
  },
  {
    category: 'Light Jet',
    minGallons: 100,
    rampFee: 150,
    aircraft: ['Beechjet/Diamond/HS400A', 'CitationJet/CJ1/2/3/525', 'Citation I/I-SP/500/501', 'Citation II/II-SP Bravo/550/51', 'Citation Ultra/Encore/560', 'Premier I, II', 'Falcon-10', 'Learjet LR-20 & 30 Series', 'Embraer Phenom 300'],
  },
  {
    category: 'Very Light Jet',
    minGallons: 75,
    rampFee: 100,
    aircraft: ['Citation Mustang', 'Citation 500/501', 'Diamond D-Jet', 'Eclipse 500', 'Embraer Phenom 100', 'HondaJet', 'PiperJet'],
  },
  {
    category: 'Heavy Turboprop',
    minGallons: 75,
    rampFee: 100,
    aircraft: ['Beech 1900', 'ATR 42/72', 'British Aerospace HS 748', 'De Havilland DHC 8 DASH 8', 'Embraer Brasilia EMB 120', 'Shorts 330', 'Dornier 328', 'Bell-212', 'Bell-412', 'Sikorsky S-76B/C'],
  },
  {
    category: 'Medium Turboprop',
    minGallons: 60,
    rampFee: 80,
    aircraft: ['BAe Jetstream/J31/41', 'Cheyenne 3/III/4/IV', 'Beech 99', 'DHC 6 Twin Otter', 'Dornier 228', 'King Air 100/200/300/350', 'Merlin I-IV', 'Mitsubishi MU-2', 'Piaggio Avanti P180'],
  },
  {
    category: 'Light Turboprop',
    minGallons: 50,
    rampFee: 60,
    aircraft: ['Cessna C-425/Conquest I', 'Cessna C-441/Conquest II', 'Cessna C-208 Caravan', 'Piper PA-31T Cheyenne I/II', 'King Air 90/F90', 'Pilatus PC-12', 'Piper PA-46-500TP Meridian', 'TBM 700'],
  },
  {
    category: 'Heavy Twin (Avgas)',
    minGallons: 30,
    rampFee: 50,
    aircraft: ['Beech 18', 'Beech Be-65 Queen Air', 'Beech Twin Bonanza', 'Cessna C-400 Series', 'Beech Duke', 'Piper Chieftain', 'Piper Navajo', 'Piper Mojave', 'Shrike Commander 580', 'Aero Commander'],
  },
  {
    category: 'Light Twin (Avgas)',
    minGallons: 30,
    rampFee: 40,
    aircraft: ['Baron 55/58', 'Beech Duchess', 'Cessna C-300 Series', 'Grumman Cougar', 'Piper Seneca', 'Piper Aztec', 'Piper Aerostar', 'Partenavia'],
  },
  {
    category: 'Single Engine (Avgas)',
    minGallons: 5,
    rampFee: 10,
    aircraft: ['Single Engine AVGAS', 'Robinson R22/R44', 'Schweizer 300/330', 'Enstrom 280/480/F28'],
  },
]

export const INITIAL_MOVEMENTS = [
  // ── INBOUND ──
  {
    id: '1',
    direction: 'inbound',
    tailNumber: 'N482KW',
    aircraftType: 'Cessna 172',
    rampFeeCategory: 'Single Engine (Avgas)',
    eta: today(14, 35),
    paxCount: 2,
    fuelRequest: {
      type: 'Avgas',
      gallons: 38,
      method: 'over-wing',
    },
    services: ['Ramp parking', 'Crew car'],
    pilotNotes: 'Quick turn, back out by 16:00. Business pax.',
    status: 'pending',
    adsb: {
      distanceNm: 42,
      altitude: 4500,
      groundspeed: 118,
    },
  },
  {
    id: '2',
    direction: 'inbound',
    tailNumber: 'N7731T',
    aircraftType: 'Piper PA-28',
    rampFeeCategory: 'Single Engine (Avgas)',
    eta: today(15, 10),
    paxCount: 1,
    fuelRequest: {
      type: 'Avgas',
      gallons: 24,
      method: 'over-wing',
    },
    services: ['Hangar overnight'],
    pilotNotes: 'First time at this FBO.',
    status: 'pending',
    adsb: {
      distanceNm: 78,
      altitude: 6500,
      groundspeed: 126,
    },
  },
  {
    id: '3',
    direction: 'inbound',
    tailNumber: 'N103PG',
    aircraftType: 'Bombardier GL5T',
    rampFeeCategory: 'Super Heavy Jet',
    eta: today(16, 40),
    paxCount: 3,
    fuelRequest: {
      type: 'Jet-A',
      gallons: 60,
      method: 'single-point',
    },
    services: ['De-icing', 'GPU power'],
    pilotNotes: 'Prefer nose-in parking.',
    status: 'pending',
    adsb: {
      distanceNm: 124,
      altitude: 8500,
      groundspeed: 172,
    },
  },
  {
    id: '4',
    direction: 'inbound',
    tailNumber: 'N550GD',
    aircraftType: 'Cessna Citation CJ3',
    rampFeeCategory: 'Light Jet',
    eta: today(17, 15),
    paxCount: 4,
    fuelRequest: {
      type: 'Jet-A',
      gallons: 120,
      method: 'single-point',
    },
    services: ['Ramp parking', 'Crew car', 'Catering coordination'],
    pilotNotes: 'Corporate pickup. Need car for 4 pax to IAH.',
    status: 'pending',
    adsb: {
      distanceNm: 156,
      altitude: 35000,
      groundspeed: 378,
    },
  },
  {
    id: '5',
    direction: 'inbound',
    tailNumber: 'N921KA',
    aircraftType: 'King Air 350',
    rampFeeCategory: 'Medium Turboprop',
    eta: today(17, 50),
    paxCount: 6,
    fuelRequest: {
      type: 'Jet-A',
      gallons: 80,
      method: 'over-wing',
    },
    services: ['GPU power', 'Hangar overnight'],
    pilotNotes: 'RON. Full fuel in AM before 0700 departure.',
    status: 'pending',
    adsb: {
      distanceNm: 210,
      altitude: 24000,
      groundspeed: 285,
    },
  },

  // ── OUTBOUND ──
  {
    id: '6',
    direction: 'outbound',
    tailNumber: 'N227WT',
    aircraftType: 'Cirrus SR22',
    rampFeeCategory: 'Single Engine (Avgas)',
    etd: today(14, 45),
    paxCount: 1,
    fuelRequest: {
      type: 'Avgas',
      gallons: 50,
      method: 'over-wing',
    },
    services: [],
    pilotNotes: 'Top off both tanks. Departing VFR to KAUS.',
    status: 'ready',
  },
  {
    id: '7',
    direction: 'outbound',
    tailNumber: 'N415MJ',
    aircraftType: 'Hawker 800XP',
    rampFeeCategory: 'Medium Jet',
    etd: today(15, 30),
    paxCount: 5,
    fuelRequest: {
      type: 'Jet-A',
      gallons: 200,
      method: 'single-point',
    },
    services: ['GPU power', 'Catering coordination'],
    pilotNotes: 'Pax arriving at 15:00. Hot ramp, engines running load.',
    status: 'fueled',
  },
  {
    id: '8',
    direction: 'outbound',
    tailNumber: 'N88TX',
    aircraftType: 'Beechcraft Baron 58',
    rampFeeCategory: 'Light Twin (Avgas)',
    etd: today(16, 0),
    paxCount: 2,
    fuelRequest: {
      type: 'Avgas',
      gallons: 40,
      method: 'over-wing',
    },
    services: ['Crew car'],
    pilotNotes: 'Crew car return by 15:45.',
    status: 'pending',
  },
  {
    id: '9',
    direction: 'outbound',
    tailNumber: 'N333FL',
    aircraftType: 'Pilatus PC-12',
    rampFeeCategory: 'Light Turboprop',
    etd: today(18, 0),
    paxCount: 8,
    fuelRequest: {
      type: 'Jet-A',
      gallons: 55,
      method: 'over-wing',
    },
    services: ['Lavatory service'],
    pilotNotes: 'Charter flight to KSAT. Need lav serviced before departure.',
    status: 'pending',
  },
]
