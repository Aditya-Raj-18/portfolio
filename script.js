const username = 'Aditya-Raj-18';
const repoList = document.getElementById('repo-list');
const compact = (text, length = 54) => text && text.length > length ? `${text.slice(0, length - 1)}…` : text;

fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`)
  .then((response) => {
    if (!response.ok) throw new Error('GitHub unavailable');
    return response.json();
  })
  .then((repos) => {
    const publicRepos = repos.filter((repo) => !repo.fork && !repo.archived);
    if (!publicRepos.length) throw new Error('No repositories');
    repoList.innerHTML = publicRepos.map((repo) => `
      <a class="repo" href="${repo.html_url}" target="_blank" rel="noreferrer">
        <div><strong>${repo.name.replace(/-/g, ' ')}</strong><small>${compact(repo.description || repo.language || 'Public repository')}</small></div><span>↗</span>
      </a>`).join('');
  })
  .catch(() => {
    repoList.innerHTML = `<a class="repo" href="https://github.com/${username}?tab=repositories" target="_blank" rel="noreferrer"><div><strong>View all repositories on GitHub</strong><small>${username}</small></div><span>↗</span></a>`;
  });

document.getElementById('year').textContent = new Date().getFullYear();
const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('nav');
menuButton.addEventListener('click', () => { const isOpen = nav.classList.toggle('open'); menuButton.setAttribute('aria-expanded', isOpen); });
nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => nav.classList.remove('open')));

document.querySelectorAll('.skill-filter').forEach((button) => { button.addEventListener('click', () => { document.querySelectorAll('.skill-filter').forEach((item) => item.classList.remove('active')); button.classList.add('active'); const filter = button.dataset.filter; document.querySelectorAll('[data-skill]').forEach((skill) => skill.classList.toggle('hide', filter !== 'all' && !skill.dataset.skill.includes(filter))); }); });

const googleSignIn = document.querySelector('.google-signin');
const ratingEditor = document.querySelector('.rating-editor');
const ratingButtons = document.querySelectorAll('.rating-star');
const ratingComment = document.querySelector('#rating-comment');
const ratingPublish = document.querySelector('.rating-publish');
const ratingDelete = document.querySelector('.rating-delete');
const ratingStatus = document.querySelector('.rating-status');
const ratingSignedIn = document.querySelector('.rating-signed-in');
const ratingSignout = document.querySelector('.rating-signout');
const ratingList = document.querySelector('.rating-list');
const ratingCount = document.querySelector('.rating-count');
const ratingAverage = document.querySelector('.rating-average');
const showRatings = document.querySelector('.show-ratings');
const firebaseConfig = window.FIREBASE_CONFIG;
let ratingAuth;
let ratingDatabase;
let ratingUser;
let ratingItems = [];
let showAllRatings = false;
let selectedRating = 0;

function ratingInitials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function setSelectedRating(value) {
  selectedRating = value;
  ratingButtons.forEach((button) => {
    const rating = Number(button.dataset.rating);
    button.classList.toggle('active', rating <= value);
    button.setAttribute('aria-checked', rating === value);
  });
}

function renderRatings() {
  const count = ratingItems.length;
  const average = count ? ratingItems.reduce((total, item) => total + item.rating, 0) / count : 0;
  const visibleRatings = showAllRatings ? ratingItems : ratingItems.slice(0, 2);
  ratingCount.textContent = `${count} ${count === 1 ? 'rating' : 'ratings'}`;
  ratingAverage.textContent = count ? `${average.toFixed(1)} ★` : '—';
  ratingList.replaceChildren();

  if (!count) {
    const empty = document.createElement('p');
    empty.className = 'no-ratings';
    empty.textContent = 'Verified ratings will appear here.';
    ratingList.append(empty);
  }

  visibleRatings.forEach((item) => {
    const entry = document.createElement('article');
    entry.className = 'rating-entry';
    const avatar = document.createElement('span');
    avatar.className = 'rating-avatar';
    avatar.textContent = ratingInitials(item.name);
    const details = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = item.name;
    const score = document.createElement('span');
    score.textContent = `Rated ${item.rating} out of 5`;
    details.append(name, score);

    if (item.comment) {
      const comment = document.createElement('p');
      comment.className = 'rating-entry-comment';
      comment.textContent = item.comment;
      details.append(comment);
    }

    const stars = document.createElement('span');
    stars.className = 'rating-entry-stars';
    stars.setAttribute('aria-label', `${item.rating} out of 5 stars`);
    stars.textContent = `${'★'.repeat(item.rating)}${'☆'.repeat(5 - item.rating)}`;
    entry.append(avatar, details, stars);
    ratingList.append(entry);
  });

  showRatings.hidden = count <= 2;
  showRatings.textContent = showAllRatings ? 'Show fewer reviews' : `See all reviews (${count})`;
}

function setRatingUser(user) {
  ratingUser = user;
  const currentRating = ratingItems.find((item) => item.id === user.uid);
  document.querySelector('.rating-login').hidden = true;
  ratingEditor.hidden = false;
  ratingSignedIn.textContent = `Verified as ${user.displayName || user.email}`;
  ratingComment.value = currentRating ? currentRating.comment || '' : '';
  setSelectedRating(currentRating ? currentRating.rating : 0);
  ratingPublish.textContent = currentRating ? 'Update rating' : 'Publish rating';
  if (ratingDelete) ratingDelete.hidden = !currentRating;
  ratingStatus.textContent = 'Your Google profile name will appear with your review.';
}

function setGuestState() {
  ratingUser = null;
  document.querySelector('.rating-login').hidden = false;
  ratingEditor.hidden = true;
  ratingPublish.textContent = 'Publish rating';
  if (ratingDelete) ratingDelete.hidden = true;
  ratingStatus.textContent = 'Sign in with Google to leave a verified rating or comment.';
}

function showGoogleSignInError(error) {
  const code = error && error.code ? error.code : 'unknown-error';
  const message = error && error.message ? error.message.replace(/^Firebase:\s*/, '') : 'Please try again.';
  ratingStatus.textContent = `Google sign-in failed (${code}): ${message}`;
}

function showRatingStorageError(action, error) {
  const code = error && error.code ? error.code : 'unknown-error';
  const message = error && error.message ? error.message.replace(/^Firebase:\s*/, '') : 'Please try again.';
  ratingStatus.textContent = `${action} failed (${code}): ${message}`;
}

function startRatingService() {
  if (!googleSignIn || !window.firebase || !firebaseConfig || !firebaseConfig.apiKey || !firebaseConfig.projectId) {
    ratingStatus.textContent = 'Verified feedback will be available after Firebase is connected.';
    if (googleSignIn) googleSignIn.disabled = true;
    return;
  }

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  ratingAuth = firebase.auth();
  ratingDatabase = firebase.firestore();

  ratingDatabase.collection('portfolioRatings').orderBy('updatedAt', 'desc').onSnapshot((snapshot) => {
    ratingItems = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((item) => item.name && Number.isInteger(item.rating));
    renderRatings();
    if (ratingUser) setRatingUser(ratingUser);
  }, (error) => {
    showRatingStorageError('Ratings could not be loaded', error);
  });

  ratingAuth.onAuthStateChanged((user) => {
    if (user && user.emailVerified) setRatingUser(user);
    else setGuestState();
  });
}

if (googleSignIn) {
  googleSignIn.addEventListener('click', async () => {
    if (!ratingAuth) return;
    googleSignIn.disabled = true;
    ratingStatus.textContent = 'Opening Google sign-in…';
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await ratingAuth.signInWithPopup(provider);
    } catch (error) {
      showGoogleSignInError(error);
    }
    googleSignIn.disabled = false;
  });

  ratingButtons.forEach((button) => button.addEventListener('click', () => setSelectedRating(Number(button.dataset.rating))));

  ratingPublish.addEventListener('click', async () => {
    if (!ratingUser || !ratingDatabase) return;
    if (!selectedRating) {
      ratingStatus.textContent = 'Choose a star rating before publishing.';
      return;
    }
    ratingPublish.disabled = true;
    ratingStatus.textContent = 'Publishing your verified feedback…';
    const existing = ratingItems.find((item) => item.id === ratingUser.uid);
    try {
      await ratingDatabase.collection('portfolioRatings').doc(ratingUser.uid).set({
        uid: ratingUser.uid,
        name: ratingUser.displayName || ratingUser.email.split('@')[0],
        rating: selectedRating,
        comment: ratingComment.value.trim(),
        createdAt: existing && existing.createdAt ? existing.createdAt : firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      ratingStatus.textContent = 'Thank you. Your verified feedback is now published.';
    } catch (error) {
      showRatingStorageError('Your feedback could not be published', error);
    }
    ratingPublish.disabled = false;
  });

  if (ratingDelete) ratingDelete.addEventListener('click', async () => {
    if (!ratingUser || !ratingDatabase) return;
    const existing = ratingItems.find((item) => item.id === ratingUser.uid);
    if (!existing) return;
    if (!window.confirm('Delete your rating and comment? This cannot be undone.')) return;
    ratingDelete.disabled = true;
    ratingStatus.textContent = 'Deleting your feedback…';
    try {
      await ratingDatabase.collection('portfolioRatings').doc(ratingUser.uid).delete();
      ratingComment.value = '';
      setSelectedRating(0);
      ratingDelete.hidden = true;
      ratingPublish.textContent = 'Publish rating';
      ratingStatus.textContent = 'Your feedback was deleted.';
    } catch (error) {
      showRatingStorageError('Your feedback could not be deleted', error);
    }
    ratingDelete.disabled = false;
  });

  ratingSignout.addEventListener('click', () => ratingAuth && ratingAuth.signOut());
  showRatings.addEventListener('click', () => {
    showAllRatings = !showAllRatings;
    renderRatings();
  });
  renderRatings();
  startRatingService();
}

const helperPanel = document.querySelector('.helper-panel');
const helperToggle = document.querySelector('.helper-toggle');
const helperClose = document.querySelector('.helper-close');
const helperMessages = document.querySelector('.helper-messages');
const helperForm = document.querySelector('.helper-form');

function portfolioAnswer(question) {
  const text = question.toLowerCase();
  if (/\b(mca|cgpa|cspa)\b/.test(text)) return 'Aditya is pursuing an MCA from Graphic Era University, Dehradun, with a CGPA of 8.11.';
  if (/\b(bca|arcade|college)\b/.test(text)) return 'Aditya completed his BCA from Arcade Business College, Patna, with 74.73%.';
  if (/\b(12th|xii|higher secondary|intermediate)\b/.test(text)) return 'Aditya completed Class XII from the Uttar Pradesh Board in 2022 with 68.17%.';
  if (/\b(10th|x|secondary|cbse)\b/.test(text)) return 'Aditya completed Class X from CBSE in 2020 with 62.8%.';
  if (/\b(marks|score|percentage|academic|education)\b/.test(text)) return 'Academic record: MCA at Graphic Era University — CGPA 8.11; BCA at Arcade Business College, Patna — 74.73%; Class XII — 68.17%; Class X — 62.8%.';
  if (/\b(transport|booking|route)\b/.test(text)) return 'The Transport Management System is a browser-based project for Dehradun routes. It includes customer, admin and driver dashboards, trip schedules, bookings, seats, tickets and reports.';
  if (/\b(library|book|issue|return)\b/.test(text)) return 'The Integrated Library System manages books, members, issue and return tracking, overdue records, transactions and reports.';
  if (/\b(house|price prediction|machine learning project)\b/.test(text)) return 'The House Price Prediction System uses property details, including area, rooms, bathrooms, floors, age, plot type and Dehradun location rates, to estimate house prices.';
  if (/\b(project|work|github)\b/.test(text)) return 'Featured projects are the Transport Management System, Integrated Library System and House Price Prediction System. Their repositories are linked in the Work section.';
  if (/\b(skill|java|python|javascript|sql|technology|language)\b/.test(text)) return 'Aditya works with Python, Java, JavaScript, Node.js, HTML/CSS, SQL, Oracle Database, machine learning, data structures, C/C++ and PL/SQL.';
  if (/\b(internship|experience|codtech)\b/.test(text)) return 'Aditya completed a Frontend Web Development internship at CodTech IT Solutions from April to May 2025.';
  if (/\b(certificate|certification|guvi)\b/.test(text)) return 'His certificates include ChatGPT from GUVI, HTML, C, Java, Python, Software Engineering Job Simulation, and SQL with Relational Databases.';
  if (/\b(contact|email|gmail|phone|number|linkedin|whatsapp|hire|recruit)\b/.test(text)) return 'You can contact Aditya at adityat9122@gmail.com or +91 7903704674. His LinkedIn profile and WhatsApp contact button are available in the Contact section.';
  if (/\b(hello|hi|hey)\b/.test(text)) return 'Hello! I can answer questions from Aditya’s portfolio, such as MCA CGPA, BCA college, marks, projects, skills, internship, certificates, or contact details.';
  return 'I can answer information available in Aditya’s portfolio. Try asking about MCA CGPA, BCA college, Class XII marks, projects, skills, internship, certificates, or contact details.';
}

function addHelperMessage(text, sender) {
  const message = document.createElement('div');
  message.className = `helper-message ${sender}`;
  message.textContent = text;
  helperMessages.append(message);
  helperMessages.scrollTop = helperMessages.scrollHeight;
}

function askPortfolio(question) {
  addHelperMessage(question, 'visitor');
  addHelperMessage(portfolioAnswer(question), 'assistant');
}

helperToggle.addEventListener('click', () => {
  const open = helperPanel.classList.toggle('open');
  helperToggle.setAttribute('aria-expanded', open);
  if (open) helperForm.querySelector('input').focus();
});
helperClose.addEventListener('click', () => { helperPanel.classList.remove('open'); helperToggle.setAttribute('aria-expanded', 'false'); });
document.querySelectorAll('[data-helper-question]').forEach((button) => button.addEventListener('click', () => askPortfolio(button.dataset.helperQuestion)));
helperForm.addEventListener('submit', (event) => { event.preventDefault(); const input = helperForm.querySelector('input'); const question = input.value.trim(); if (!question) return; askPortfolio(question); input.value = ''; });

const themeToggle = document.querySelector('.theme-toggle');
themeToggle.addEventListener('click', () => { document.body.classList.toggle('dark'); themeToggle.textContent = document.body.classList.contains('dark') ? '☼' : '◐'; });
const progressBar = document.querySelector('.progress-bar');
window.addEventListener('scroll', () => { const maximum = document.documentElement.scrollHeight - window.innerHeight; progressBar.style.width = `${maximum ? (window.scrollY / maximum) * 100 : 0}%`; }, { passive: true });
