// Personnel data parsed from uploaded "personel_information.xlsx" + payroll bank/NSSF/TIN
// Used for one-click HR Employee import.

export interface StaffImportRow {
  full_name: string;
  job_title: string;
  email?: string;
  phone?: string;
  bank_name?: string;
  bank_account?: string;
  nssf_number?: string;
  tin_number?: string;
  nin_number?: string;
  next_of_kin?: string;
  next_of_kin_contact?: string;
  origin?: string;
  education?: string;
  gender?: string;
  date_of_birth?: string;
}

export const STAFF_IMPORT: StaffImportRow[] = [
  { full_name: 'Monica Muduwa', job_title: 'Teacher', phone: '+256773306298', education: 'Certificate in Early Childhood Development', origin: 'Bulambuli', next_of_kin: 'Doreen Nafuna', next_of_kin_contact: '+256751037328', gender: 'Female', date_of_birth: '1999-10-26' },
  { full_name: 'Racheal Prisca Aboth', job_title: 'Teacher', phone: '+256763024826', email: 'rachealpriscaaboth@gmail.com', education: 'Certificate in Early Childhood Development', origin: 'Tororo', next_of_kin: 'David Oyana', gender: 'Female', date_of_birth: '2001-06-18' },
  { full_name: 'Loy Atworo', job_title: 'Teacher', phone: '+256785582855', nin_number: 'CF95074101M5NA', tin_number: '1045777408', education: 'UCE', origin: 'Dokolo', next_of_kin: 'Martin Owiny', next_of_kin_contact: '+256775154339', gender: 'Female', date_of_birth: '1995-04-22' },
  { full_name: 'Robina Apio', job_title: 'Teacher', phone: '+256760026325', email: 'apiorobina8@gmail.com', nin_number: 'CF0402210CTIG', education: 'Certificate in Early Childhood Development', origin: 'Lira', next_of_kin: 'George Okello', next_of_kin_contact: '+256787891439', gender: 'Female', date_of_birth: '2004-10-13' },
  { full_name: 'Wyclif Kagoma', job_title: 'Teacher', phone: '+256760995993', email: 'wcyclifkagomu@gmail.com', nin_number: 'CM96075104LVNL', bank_name: 'DFCU', bank_account: '01110016097834', education: 'Grade III Certificate', origin: 'Namutumba', next_of_kin: 'Shadia Kagoma', next_of_kin_contact: '+256704037258', gender: 'Male', date_of_birth: '1996-12-21' },
  { full_name: 'Thomas Omus', job_title: 'Director of Studies', phone: '+256766292656', email: 'thomasomus86@gmail.com', education: 'Grade III Certificate', origin: 'Bukedea', next_of_kin: 'Hellen Namukisa', next_of_kin_contact: '+256766292656', gender: 'Male', date_of_birth: '1986-11-12' },
  { full_name: 'Simon Peter Longok', job_title: 'Teacher', phone: '+256777377597', email: 'longoksimonpeter@gmail.com', nin_number: 'CM98107101CDPC', education: 'UACE', origin: 'Napak', next_of_kin: 'Markson Abura', next_of_kin_contact: '+256782675652', gender: 'Male', date_of_birth: '2000-02-01' },
  { full_name: 'Joyce Amongin', job_title: 'Teacher', phone: '+256764800610', email: 'amonginjoyce@gmail.com', education: 'Certificate in Early Childhood Development', origin: 'Kumi', next_of_kin: 'Tukei Nicholas', next_of_kin_contact: '+256764800610', gender: 'Female', date_of_birth: '2000-03-11' },
  { full_name: 'Charlotte Gift Hirya', job_title: 'Teacher', nin_number: 'CF0606010AZ8CJ', education: 'UCE', origin: 'Butaleja', next_of_kin: 'Bessie Kaumba', next_of_kin_contact: '+256746604042', gender: 'Female', date_of_birth: '2006-11-24' },
  { full_name: 'Miriam Nabulwala', job_title: 'Teacher', phone: '+256764253723', education: 'UCE', origin: 'Mbale', next_of_kin: 'John Wangusi', next_of_kin_contact: '+256764253723', gender: 'Female', date_of_birth: '2004-07-27' },
  { full_name: 'Catherine Akiteng', job_title: 'Secretary', phone: '+256771651505', email: 'akitengcatherine74@gmail.com', bank_name: 'DFCU', bank_account: '01110017663137', nssf_number: '8101900009653', tin_number: '1025026267', education: 'Diploma in Social Development', origin: 'Katakwi', next_of_kin: 'Rebecca Akello', next_of_kin_contact: '+256771651505', gender: 'Female', date_of_birth: '1981-12-19' },
  { full_name: 'Anna Margaret Amoding', job_title: 'Teacher', phone: '+256788755578', education: 'Certificate in Early Childhood Development', origin: 'Kumi', next_of_kin: 'Jacob Iramiot Stanley', next_of_kin_contact: '+256788755578', gender: 'Female', date_of_birth: '1994-06-13' },
  { full_name: 'Stella Imolu', job_title: 'Teacher', phone: '+256779408551', nin_number: 'CF82058103FKFH', education: 'Certificate in Nursery Teaching', origin: 'Kapelebyong', next_of_kin: 'John Max Olila', next_of_kin_contact: '+256779408551', gender: 'Female', date_of_birth: '1982-03-13' },
  { full_name: 'Phionah Merab Kilabo', job_title: 'Teacher', phone: '+256766854152', nin_number: 'CF9506710E8TLL', bank_name: 'Post Bank', bank_account: '1030082001301', education: 'Certificate in Early Childhood Development', origin: 'Manafwa', next_of_kin: 'Stanley Musungu', next_of_kin_contact: '+256780554093', gender: 'Female', date_of_birth: '1990-10-09' },
  { full_name: 'Patrick Masolo', job_title: 'Teacher', phone: '+256789164624', email: 'masolopatrick33@gmail.com', nin_number: 'CM83026101GRAK', bank_name: 'Centenary', bank_account: '3205399307', nssf_number: '1983150891422', tin_number: '1057449601', education: 'Grade III Certificate', origin: 'Mbale', next_of_kin: 'Scovia Nandudu', next_of_kin_contact: '+256776724946', gender: 'Male', date_of_birth: '1983-09-24' },
  { full_name: 'Rose Nankoma', job_title: 'Teacher', phone: '+256763345658', email: 'nankomarose907@gmail.com', bank_name: 'Centenary', bank_account: '3204603603', education: 'Degree in Business Administration', origin: 'Bukedea', next_of_kin: 'Philomena Agwang', next_of_kin_contact: '+256776902122', gender: 'Female', date_of_birth: '1990-07-27' },
];
