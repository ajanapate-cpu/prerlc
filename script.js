const input = document.querySelector('#searchInput');
const items = [...document.querySelectorAll('.searchable')];
const toast = document.querySelector('#toast');

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function filterResults(value) {
  const query = value.trim().toLowerCase();
  let count = 0;
  items.forEach((item) => {
    const matches = !query || item.dataset.search.includes(query);
    item.hidden = !matches;
    if (matches) count += 1;
  });
  document.querySelectorAll('.no-results').forEach((item) => item.remove());
  if (query && count === 0) {
    const message = document.createElement('p');
    message.className = 'no-results';
    message.textContent = `No communities found for “${value}”. Try another search.`;
    document.querySelector('#serverList').append(message);
  }
}

document.querySelector('#searchForm').addEventListener('submit', (event) => {
  event.preventDefault();
  filterResults(input.value);
  document.querySelector('#popular').scrollIntoView({ behavior: 'smooth' });
  notify(input.value ? `Showing results for “${input.value}”` : 'Showing all communities');
});
input.addEventListener('input', (event) => filterResults(event.target.value));
document.querySelectorAll('[data-search]').forEach((button) => button.addEventListener('click', () => {
  input.value = button.dataset.search;
  filterResults(input.value);
  document.querySelector('#popular').scrollIntoView({ behavior: 'smooth' });
}));
document.querySelector('.discord').addEventListener('click', () => notify('Discord invite coming soon.'));
document.querySelector('.list-link').addEventListener('click', (event) => {
  event.preventDefault();
  notify('Server submissions are opening soon.');
});

const loginModal = document.querySelector('#loginModal');
const loginStep = document.querySelector('#loginStep');
const profileForm = document.querySelector('#profileForm');

function closeLogin() {
  loginModal.classList.remove('is-open');
  loginModal.setAttribute('aria-hidden', 'true');
}

document.querySelectorAll('.open-login').forEach((button) => button.addEventListener('click', () => {
  loginModal.classList.add('is-open');
  loginModal.setAttribute('aria-hidden', 'false');
}));
document.querySelectorAll('[data-close-login]').forEach((button) => button.addEventListener('click', closeLogin));
document.querySelector('#discordLogin').addEventListener('click', () => {
  loginStep.hidden = true;
  profileForm.hidden = false;
});
profileForm.addEventListener('submit', (event) => {
  event.preventDefault();
  closeLogin();
  profileForm.reset();
  profileForm.hidden = true;
  loginStep.hidden = false;
  notify('Your profile is ready to be reviewed.');
});
