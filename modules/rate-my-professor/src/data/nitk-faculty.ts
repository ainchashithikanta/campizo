// NITK Surathkal faculty directory — compiled from the official department
// websites (nitk.ac.in / cse / ece / eee / mech / civil / it / mining / macs /
// physics / chemistry / chemical / mme / hss / wroe subdomains), department-wise,
// as of August 2026. Used only for SEED_DEMO_DATA=true demo seeding.
// Names are public directory information; designations follow each department's
// published faculty listing.

export interface NitkDepartment {
  id: string;
  name: string;
  shortName: string;
}

export interface NitkProfessor {
  fullName: string;
  departmentId: string;
  designation: 'Professor' | 'Associate Professor' | 'Assistant Professor';
  slug: string;
}

export const NITK_DEPARTMENTS: NitkDepartment[] = [
  { id: 'dept-cs-001', name: 'Computer Science & Engineering', shortName: 'CSE' },
  { id: 'dept-ec-001', name: 'Electronics & Communication Engineering', shortName: 'ECE' },
  { id: 'dept-eee-001', name: 'Electrical & Electronics Engineering', shortName: 'EEE' },
  { id: 'dept-me-001', name: 'Mechanical Engineering', shortName: 'MECH' },
  { id: 'dept-civil-001', name: 'Civil Engineering', shortName: 'CIVIL' },
  { id: 'dept-it-001', name: 'Information Technology', shortName: 'IT' },
  { id: 'dept-mining-001', name: 'Mining Engineering', shortName: 'MINING' },
  { id: 'dept-macs-001', name: 'Mathematical & Computational Sciences', shortName: 'MACS' },
  { id: 'dept-phy-001', name: 'Physics', shortName: 'PHYSICS' },
  { id: 'dept-chem-001', name: 'Chemistry', shortName: 'CHEM' },
  { id: 'dept-che-001', name: 'Chemical Engineering', shortName: 'CHENG' },
  { id: 'dept-mme-001', name: 'Metallurgical & Materials Engineering', shortName: 'MME' },
  { id: 'dept-hss-001', name: 'Humanities, Social Sciences & Management', shortName: 'HSS' },
  { id: 'dept-wroe-001', name: 'Water Resources & Ocean Engineering', shortName: 'WROE' }
];

const CS = 'dept-cs-001';
const EC = 'dept-ec-001';
const EE = 'dept-eee-001';
const ME = 'dept-me-001';
const CV = 'dept-civil-001';
const IT = 'dept-it-001';
const MN = 'dept-mining-001';
const MC = 'dept-macs-001';
const PH = 'dept-phy-001';
const CH = 'dept-chem-001';
const CE = 'dept-che-001';
const MM = 'dept-mme-001';
const HS = 'dept-hss-001';
const WR = 'dept-wroe-001';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function p(fullName: string, departmentId: string, designation: NitkProfessor['designation']): NitkProfessor {
  return { fullName, departmentId, designation, slug: slugify(fullName) };
}

export const NITK_PROFESSORS: NitkProfessor[] = [
  // ── Computer Science & Engineering ──────────────────────────────────
  p('Dr. Alwyn Roshan Pais', CS, 'Professor'),
  p('Prof. Annappa', CS, 'Professor'),
  p('Prof. K. Chandrasekaran', CS, 'Professor'),
  p('Prof. P. Santhi Thilagam', CS, 'Professor'),
  p('Dr. Shashidhar G. Koolagudi', CS, 'Professor'),
  p('Dr. B. R. Chandavarkar', CS, 'Associate Professor'),
  p('Dr. Basavaraj Talawar', CS, 'Associate Professor'),
  p('Dr. Jeny Rajan', CS, 'Associate Professor'),
  p('Dr. Manu Basavaraju', CS, 'Associate Professor'),
  p('Dr. Mohit P. Tahiliani', CS, 'Associate Professor'),
  p('Mrs. Vani M.', CS, 'Associate Professor'),
  p('Dr. M. Venkatesan', CS, 'Associate Professor'),
  p('Dr. Abhilash M. H.', CS, 'Assistant Professor'),
  p('Dr. Biswajit R. Bhowmik', CS, 'Assistant Professor'),
  p('Dr. Mahendra Pratap Singh', CS, 'Assistant Professor'),
  p('Dr. Manjanna B.', CS, 'Assistant Professor'),
  p('Dr. Radhika B. S.', CS, 'Assistant Professor'),
  p('Dr. Saumya Hegde', CS, 'Assistant Professor'),
  p('Dr. Shridhar Sanshi', CS, 'Assistant Professor'),
  p('Dr. Sourav Kanti Addya', CS, 'Assistant Professor'),
  p('Dr. Ajay Pratap', CS, 'Assistant Professor'),

  // ── Electronics & Communication Engineering ─────────────────────────
  p('Prof. M. S. Bhat', EC, 'Professor'),
  p('Prof. Sumam David S.', EC, 'Professor'),
  p('Prof. U. Shripathi Acharya', EC, 'Professor'),
  p('Prof. T. Laxminidhi', EC, 'Professor'),
  p('Prof. Ramesh Kini M.', EC, 'Professor'),
  p('Dr. Shyam Lal', EC, 'Associate Professor'),
  p('Dr. Rekha S.', EC, 'Associate Professor'),
  p('Dr. A. V. Narasimhadhan', EC, 'Assistant Professor'),
  p('Dr. Amareswararao Kavuri', EC, 'Assistant Professor'),
  p('Dr. Aparna P.', EC, 'Assistant Professor'),
  p('Dr. Ashvini Chaturvedi', EC, 'Assistant Professor'),
  p('Dr. B. Nagavel', EC, 'Assistant Professor'),
  p('Dr. Bini A. A.', EC, 'Assistant Professor'),
  p('Dr. Deepu Vijayasenan', EC, 'Assistant Professor'),
  p('Dr. Gopal Rawat', EC, 'Assistant Professor'),
  p('Dr. Kalpana G. Bhat', EC, 'Assistant Professor'),
  p('Dr. Krishnamoorthy K.', EC, 'Assistant Professor'),
  p('Dr. Laishram Thoibileima Chanu', EC, 'Assistant Professor'),
  p('Dr. Maisagalla Gopal', EC, 'Assistant Professor'),
  p('Dr. Mandeep Singh', EC, 'Assistant Professor'),
  p('Dr. Neelawar Shekar Vittal Shet', EC, 'Assistant Professor'),
  p('Dr. Nikhil K. S.', EC, 'Assistant Professor'),
  p('Dr. Pathipati Srihari', EC, 'Assistant Professor'),
  p('Dr. Prabu K.', EC, 'Assistant Professor'),
  p('Dr. Prashantha Kumar H.', EC, 'Assistant Professor'),
  p('Dr. Raghavendra B. S.', EC, 'Assistant Professor'),
  p('Dr. Rajshree Rajkumari', EC, 'Assistant Professor'),
  p('Dr. Rathnamala Rao', EC, 'Assistant Professor'),
  p('Dr. Sushil Kumar Pandey', EC, 'Assistant Professor'),

  // ── Electrical & Electronics Engineering ────────────────────────────
  p('Prof. Udaykumar R. Yaragatti', EE, 'Professor'),
  p('Prof. Panduranga Vittal K.', EE, 'Professor'),
  p('Prof. Shubhanga K. N.', EE, 'Professor'),
  p('Prof. Manjunatha Sharma K.', EE, 'Professor'),
  p('Prof. Dattatraya Narayan Gaonkar', EE, 'Professor'),
  p('Prof. K. Rajagopala Rao', EE, 'Professor'),
  p('Prof. Tukaram Moger', EE, 'Professor'),
  p('Prof. B. Venkatesa Perumal', EE, 'Professor'),
  p('Prof. Jora M. Gonda', EE, 'Professor'),
  p('Prof. Vinatha U.', EE, 'Professor'),
  p('Prof. Debashisha Jena', EE, 'Professor'),
  p('Prof. Parthiban P.', EE, 'Associate Professor'),
  p('Prof. H. Girisha Navada', EE, 'Associate Professor'),
  p('Prof. Krishnan C. M. C.', EE, 'Associate Professor'),
  p('Dr. B. Dastagiri Reddy', EE, 'Assistant Professor'),
  p('Dr. Dharavath Kishan', EE, 'Assistant Professor'),
  p('Dr. Md Waseem Ahmad', EE, 'Assistant Professor'),
  p('Dr. Prajof P.', EE, 'Assistant Professor'),
  p('Dr. Ravi Raushan', EE, 'Assistant Professor'),
  p('Dr. Vignesh Kumar V.', EE, 'Assistant Professor'),
  p('Dr. Arun Dominic', EE, 'Assistant Professor'),
  p('Dr. A. Karthikeyan', EE, 'Assistant Professor'),
  p('Dr. Shashidhara Mecha Kotian', EE, 'Assistant Professor'),
  p('Dr. U. M. Sandeep Kumar', EE, 'Assistant Professor'),
  p('Dr. Yashwant Kashyap', EE, 'Assistant Professor'),

  // ── Mechanical Engineering ──────────────────────────────────────────
  p('Prof. Anish S.', ME, 'Professor'),
  p('Prof. Arun M.', ME, 'Professor'),
  p('Prof. Hemantha Kumar', ME, 'Professor'),
  p('Prof. Shivananda Nayaka H.', ME, 'Professor'),
  p('Prof. Jeyaraj P.', ME, 'Professor'),
  p('Prof. Kumar G. N.', ME, 'Professor'),
  p('Prof. Gangadharan K. V.', ME, 'Professor'),
  p('Prof. G. C. Mohan Kumar', ME, 'Professor'),
  p('Prof. Ramesh M. R.', ME, 'Professor'),
  p('Prof. S. M. Murigendrappa', ME, 'Professor'),
  p('Prof. Prasad Krishna', ME, 'Professor'),
  p('Prof. Ravikiran Kadoli', ME, 'Professor'),
  p('Prof. Sathyabhama A.', ME, 'Professor'),
  p('Prof. Kulkarni Satyabodh M.', ME, 'Professor'),
  p('Prof. Narendranath S.', ME, 'Professor'),
  p('Prof. Veershetty Gumtapure', ME, 'Professor'),
  p('Prof. Srikanth Bontha', ME, 'Professor'),
  p('Prof. Sharnappa Joladarashi', ME, 'Professor'),
  p('Prof. Shrikantha S. Rao', ME, 'Professor'),
  p('Prof. Subhaschandra Kattimani', ME, 'Professor'),
  p('Prof. Sudhakar C. Jambagi', ME, 'Associate Professor'),
  p('Prof. Vasudeva M.', ME, 'Associate Professor'),
  p('Prof. Mervin A. Herbert', ME, 'Associate Professor'),
  p('Prof. Ranjith M.', ME, 'Associate Professor'),
  p('Prof. Navin Karanth P.', ME, 'Associate Professor'),
  p('Prof. Poornesh Kumar Koorata', ME, 'Associate Professor'),
  p('Dr. Somasekhara Rao Todeti', ME, 'Assistant Professor'),
  p('Dr. Saurabh Chandraker', ME, 'Assistant Professor'),
  p('Dr. Parthasarathy P.', ME, 'Assistant Professor'),
  p('Dr. Ranjeet Kumar Sahu', ME, 'Assistant Professor'),
  p('Dr. Mruthyunjaya Swamy K. B.', ME, 'Assistant Professor'),
  p('Dr. Arun Kumar Shettigar', ME, 'Assistant Professor'),
  p('Dr. A. S. S. Balan', ME, 'Assistant Professor'),
  p('Dr. Khyati Verma', ME, 'Assistant Professor'),
  p('Dr. P. S. Suvin', ME, 'Assistant Professor'),
  p('Dr. Arumuga Perumal D.', ME, 'Assistant Professor'),
  p('Dr. Mervin Joe Thomas', ME, 'Assistant Professor'),
  p('Dr. Deepak Kumar', ME, 'Assistant Professor'),
  p('Dr. Abhilash Singh', ME, 'Assistant Professor'),
  p('Dr. Neha Choudhary', ME, 'Assistant Professor'),
  p('Dr. Atul Singh Rajput', ME, 'Assistant Professor'),
  p('Dr. Raghuram S.', ME, 'Assistant Professor'),
  p('Dr. Pavan Pandit', ME, 'Assistant Professor'),
  p('Dr. Sanjeevi Nakka', ME, 'Assistant Professor'),

  // ── Civil Engineering ───────────────────────────────────────────────
  p('Prof. Sitaram Nayak', CV, 'Professor'),
  p('Prof. Subhash C. Yaragal', CV, 'Professor'),
  p('Prof. Varghese George', CV, 'Professor'),
  p('Prof. B. R. Jayalekshmi', CV, 'Professor'),
  p('Prof. Basavaraju Manu', CV, 'Professor'),
  p('Dr. A. S. Balu', CV, 'Assistant Professor'),
  p('Dr. Anupam B. R.', CV, 'Assistant Professor'),
  p('Dr. Anupama Surenjan', CV, 'Assistant Professor'),
  p('Dr. Arun Kumar Thalla', CV, 'Assistant Professor'),
  p('Dr. B. B. Das', CV, 'Assistant Professor'),
  p('Dr. Babloo Chaudhary', CV, 'Assistant Professor'),
  p('Dr. Chippagiri Ravijanya', CV, 'Assistant Professor'),
  p('Dr. Devatha C. P.', CV, 'Assistant Professor'),
  p('Dr. Gangadhar Mahesh', CV, 'Assistant Professor'),
  p('Dr. J. Vijaya Vengadesh Kumar', CV, 'Assistant Professor'),
  p('Dr. Jacklin Jeke Nilling', CV, 'Assistant Professor'),
  p('Dr. Kalyanbrata Hatui', CV, 'Assistant Professor'),
  p('Dr. Lohitkumar Nainegali', CV, 'Assistant Professor'),
  p('Dr. Mithun Mohan', CV, 'Assistant Professor'),
  p('Dr. Palanisamy T.', CV, 'Assistant Professor'),
  p('Dr. Pavan G. S.', CV, 'Assistant Professor'),
  p('Dr. Prashanth M. H.', CV, 'Assistant Professor'),
  p('Dr. Rajasekaran C.', CV, 'Assistant Professor'),
  p('Dr. Raviraj H. M.', CV, 'Assistant Professor'),
  p('Dr. Saranya P.', CV, 'Assistant Professor'),
  p('Dr. Sreekumar M.', CV, 'Assistant Professor'),
  p('Dr. Sreevalsa Kolathayar', CV, 'Assistant Professor'),
  p('Dr. Sridhar G.', CV, 'Assistant Professor'),
  p('Dr. Sunil B. M.', CV, 'Assistant Professor'),
  p('Dr. Suresha S. N.', CV, 'Assistant Professor'),
  p('Dr. T. Manjari', CV, 'Assistant Professor'),
  p('Dr. Vinoth Srinivasan', CV, 'Assistant Professor'),

  // ── Information Technology ──────────────────────────────────────────
  p('Prof. Ananthanarayana V. S.', IT, 'Professor'),
  p('Prof. Ram Mohana Reddy Guddeti', IT, 'Professor'),
  p('Prof. Jaidhar C. D.', IT, 'Professor'),
  p('Dr. Anand Kumar M.', IT, 'Associate Professor'),
  p('Dr. Sowmya Kamath S.', IT, 'Associate Professor'),
  p('Dr. Nagamma Patil', IT, 'Associate Professor'),
  p('Dr. Biju R. Mohan', IT, 'Associate Professor'),
  p('Dr. Geetha V.', IT, 'Associate Professor'),
  p('Dr. Purushothama B. R.', IT, 'Associate Professor'),
  p('Dr. Shrutilipi Bhattacharjee', IT, 'Assistant Professor'),
  p('Dr. Bhawana Rudra', IT, 'Assistant Professor'),
  p('Dr. Dinesh Naik', IT, 'Assistant Professor'),
  p('Dr. Kiran M.', IT, 'Assistant Professor'),
  p('Dr. Janani T.', IT, 'Assistant Professor'),
  p('Dr. A. Vamshi', IT, 'Assistant Professor'),

  // ── Mining Engineering ──────────────────────────────────────────────
  p('Prof. Harsha Vardhan', MN, 'Professor'),
  p('Prof. Karra Ram Chandar', MN, 'Professor'),
  p('Prof. Mandela Govinda Raj', MN, 'Professor'),
  p('Prof. Mangalpadya Aruna', MN, 'Professor'),
  p('Prof. Marutiram Kaza', MN, 'Professor'),
  p('Prof. Pijush Pal Roy', MN, 'Professor'),
  p('Dr. Anup Kumar Tripathi', MN, 'Associate Professor'),
  p('Dr. Bijay Mihir Kunar', MN, 'Associate Professor'),
  p('Dr. Sandi Kumar Reddy', MN, 'Associate Professor'),
  p('Dr. Akhil Avchar', MN, 'Assistant Professor'),
  p('Dr. Amrites Senapati', MN, 'Assistant Professor'),

  // ── Mathematical & Computational Sciences ───────────────────────────
  p('Prof. B. R. Shankar', MC, 'Professor'),
  p('Prof. Murulidhar N. N.', MC, 'Professor'),
  p('Prof. P. Sam Johnson', MC, 'Professor'),
  p('Prof. Pushparaj Shetty D.', MC, 'Professor'),
  p('Prof. R. Madhusudhan', MC, 'Professor'),
  p('Prof. Santhosh George', MC, 'Professor'),
  p('Prof. Shyam S. Kamath', MC, 'Professor'),
  p('Prof. V. Murugan', MC, 'Professor'),
  p('Dr. A. Senthil Thilak', MC, 'Associate Professor'),
  p('Dr. Chandhini G.', MC, 'Associate Professor'),
  p('Dr. Jidesh P.', MC, 'Associate Professor'),
  p('Dr. Jothi Ramalingam', MC, 'Associate Professor'),
  p('Dr. Kedarnath Senapati', MC, 'Associate Professor'),
  p('Dr. Srinivasa Rao Kola', MC, 'Associate Professor'),
  p('Dr. Amit Kumar', MC, 'Assistant Professor'),
  p('Dr. Falguni Roy', MC, 'Assistant Professor'),
  p('Dr. Gayathri P.', MC, 'Assistant Professor'),
  p('Dr. Jerry W. Sangma', MC, 'Assistant Professor'),
  p('Dr. Jisna V. A.', MC, 'Assistant Professor'),
  p('Dr. Mahima', MC, 'Assistant Professor'),
  p('Dr. Manisha Aggarwal', MC, 'Assistant Professor'),
  p('Dr. Pushpajit Khaire', MC, 'Assistant Professor'),
  p('Dr. Samadrita Bera', MC, 'Assistant Professor'),
  p('Dr. Vidyadhar Upadhya', MC, 'Assistant Professor'),
  p('Dr. Vishwanath K. P.', MC, 'Assistant Professor'),
  p('Dr. Vivek Sinha', MC, 'Assistant Professor'),

  // ── Physics ─────────────────────────────────────────────────────────
  p('Prof. N. K. Udayashankar', PH, 'Professor'),
  p('Prof. Ajith K. M.', PH, 'Professor'),
  p('Prof. M. N. Satyanarayan', PH, 'Professor'),
  p('Prof. Nagaraja H. S.', PH, 'Professor'),
  p('Dr. Kartick Tarafder', PH, 'Associate Professor'),
  p('Dr. Partha Pratim Das', PH, 'Associate Professor'),
  p('Dr. Nidhi Adhlakha', PH, 'Assistant Professor'),
  p('Dr. Pritha Dolai', PH, 'Assistant Professor'),
  p('Dr. T. K. Shajahan', PH, 'Assistant Professor'),
  p('Dr. V. Sreenath', PH, 'Assistant Professor'),

  // ── Chemistry ───────────────────────────────────────────────────────
  p('Prof. Ampar Chitharanjan Hegde', CH, 'Professor'),
  p('Prof. Arun Mohan Isloor', CH, 'Professor'),
  p('Prof. Badekai Ramachandra Bhat', CH, 'Professor'),
  p('Prof. Denthaje Krishna Bhat', CH, 'Professor'),
  p('Prof. Darshak R. Trivedi', CH, 'Professor'),
  p('Prof. Udaya Kumar Dalimba', CH, 'Professor'),
  p('Dr. Beneesh P. B.', CH, 'Associate Professor'),
  p('Dr. Debashree Chakraborty', CH, 'Associate Professor'),
  p('Dr. Saikat Dutta', CH, 'Associate Professor'),
  p('Dr. Sib Sankar Mal', CH, 'Associate Professor'),
  p('Dr. Lakshmi Vellanki', CH, 'Assistant Professor'),
  p('Dr. Vijayendra S. Shetti', CH, 'Assistant Professor'),

  // ── Chemical Engineering ────────────────────────────────────────────
  p('Prof. Keyur Raval', CE, 'Professor'),
  p('Prof. Hari Mahalingam', CE, 'Professor'),
  p('Prof. I. Regupathi', CE, 'Professor'),
  p('Dr. S. Jitendra Pal', CE, 'Assistant Professor'),
  p('Dr. Chinta Sankar Rao', CE, 'Assistant Professor'),
  p('Dr. Maneesh Kumar Poddar', CE, 'Assistant Professor'),
  p('Dr. M. Rajasekaran', CE, 'Assistant Professor'),

  // ── Metallurgical & Materials Engineering ───────────────────────────
  p('Prof. K. Narayan Prabhu', MM, 'Professor'),
  p('Prof. Jagannatha Nayak', MM, 'Professor'),
  p('Prof. Udaya Bhat K.', MM, 'Professor'),
  p('Prof. Anandhan Srinivasan', MM, 'Professor'),
  p('Prof. Preetham Kumar G. V.', MM, 'Professor'),
  p('Dr. Ravishankar K. S.', MM, 'Associate Professor'),
  p('Dr. Kumkum Banerjee', MM, 'Associate Professor'),
  p('Dr. M. Rizwanur Rahman', MM, 'Associate Professor'),
  p('Dr. Subray R. Hegde', MM, 'Associate Professor'),
  p('Dr. B. Rajasekaran', MM, 'Associate Professor'),
  p('Dr. Shashi Bhushan Arya', MM, 'Assistant Professor'),
  p('Dr. Saumen Mandal', MM, 'Assistant Professor'),
  p('Dr. Sumanth Govindarajan', MM, 'Assistant Professor'),
  p('Dr. Selvakumar Murugesan', MM, 'Assistant Professor'),
  p('Dr. Lipak Kumar Sahoo', MM, 'Assistant Professor'),

  // ── Humanities, Social Sciences & Management ────────────────────────
  p('Prof. Ritanjali Majhi', HS, 'Professor'),
  p('Prof. Aloysius Henry Sequeira', HS, 'Professor'),
  p('Prof. Shashikantha Koudur', HS, 'Professor'),
  p('Dr. Abhilasha Gusain', HS, 'Assistant Professor'),
  p('Dr. M. R. Suji Raga Priya', HS, 'Assistant Professor'),
  p('Dr. Savin Kumar H. N.', HS, 'Assistant Professor'),

  // ── Water Resources & Ocean Engineering ─────────────────────────────
  p('Prof. Vittal Hegde A.', WR, 'Professor'),
  p('Prof. N. Lakshman', WR, 'Professor'),
  p('Prof. M. K. Nagaraj', WR, 'Professor'),
  p('Prof. Subba Rao', WR, 'Professor'),
  p('Prof. Dwarakish G. S.', WR, 'Professor'),
  p('Prof. Amba Shetty', WR, 'Professor'),
  p('Prof. P. C. Deka', WR, 'Professor'),
  p('Prof. Ramesh H.', WR, 'Professor'),
  p('Dr. K. Varija', WR, 'Associate Professor'),
  p('Dr. Manu', WR, 'Assistant Professor'),
  p('Dr. Nasar T.', WR, 'Assistant Professor'),
  p('Dr. Debabrata Karmakar', WR, 'Assistant Professor'),
  p('Dr. Pruthviraj U.', WR, 'Assistant Professor'),
  p('Dr. K. Subrahmanya', WR, 'Assistant Professor')
];
