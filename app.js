/* YUMBOT — Application Logic v11.0 + Backend API */

/* ═══ API CONFIG ═══ */
const API_URL = ''; // Empty = same origin (uses backend server at http://localhost:3000)
const ADMIN_KEY = 'yumbot2024';

let currentUser = null;
let userProfile = null;
let hasCompletedPreferences = false;
let weeklyPlanCompleted = false;
let lastPlanCompletionDate = null;
let isDarkMode = false;
let isAdminMode = false;
let currentAuthForm = 'login';

/* ═══ API HELPERS ═══ */
async function apiCall(endpoint, options = {}) {
    try {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (currentUser) {
            headers['x-user-id'] = currentUser.id;
        }
        
        const response = await fetch(API_URL + endpoint, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'API error');
        }
        
        return data;
    } catch (err) {
        console.error('API Error:', err);
        throw err;
    }
}

async function saveProfileToBackend() {
    if (userProfile && currentUser) {
        try {
            await apiCall('/api/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    display_name: userProfile.display_name,
                    streak_count: userProfile.streak_count,
                    longest_streak: userProfile.longest_streak,
                    mastery_level: userProfile.mastery_level,
                    total_meals_planned: userProfile.total_meals_planned,
                    badges: userProfile.badges || [],
                    kudos_given: userProfile.kudos_given || 0,
                    hasCompletedPreferences: hasCompletedPreferences
                })
            });
        } catch (err) {
            console.error('Failed to save profile:', err);
        }
    }
}

const saveProfileToLocal = saveProfileToBackend;

/* ═══ DARK MODE ═══ */
function toggleDarkMode() {
    isDarkMode = document.getElementById('darkModeToggle').checked;
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('yumbot_darkMode', isDarkMode);
}

function initDarkMode() {
    const saved = localStorage.getItem('yumbot_darkMode');
    isDarkMode = saved === 'true';
    document.body.classList.toggle('dark-mode', isDarkMode);
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = isDarkMode;
}

function showMainApp() {
    const landing = document.getElementById('page-landing');
    const mainHeader = document.getElementById('mainHeader');
    const mainContent = document.getElementById('mainContent');
    const mainFooter = document.getElementById('mainFooter');
    
    if (landing) landing.style.display = 'none';
    if (mainHeader) mainHeader.style.display = 'block';
    if (mainContent) mainContent.style.display = 'block';
    if (mainFooter) mainFooter.style.display = 'block';
    
    const authBtn = document.getElementById('authBtn');
    const name = userProfile?.display_name || currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'User';
    const initial = name.charAt(0).toUpperCase();
    if (authBtn) {
        authBtn.innerHTML = '<div class="user-info"><div class="user-avatar">' + initial + '</div></div>';
        authBtn.onclick = showProfileMenu;
    }
    
    const gamiQuick = document.getElementById('gamiQuick');
    const homeStreak = document.getElementById('homeStreak');
    if (gamiQuick) gamiQuick.style.display = 'grid';
    if (homeStreak) homeStreak.style.display = 'inline-flex';
    
    updateNavAccess();
    updateGamificationUI();
}

function initLocalStorage() {
    const stored = localStorage.getItem('yumbot_profile');
    if (stored) {
        userProfile = JSON.parse(stored);
        hasCompletedPreferences = userProfile.hasCompletedPreferences || false;
        currentUser = { id: userProfile.user_id || 'local', email: userProfile.email };
        showMainApp();
    }
}

/* ═══ ACCESS CONTROL FUNCTIONS ═══ */
function checkPreferencesAccess(page) {
    if (!hasCompletedPreferences) {
        toast('Please complete your preferences first! 👆');
        show('profile');
        return false;
    }
    show(page);
    return true;
}

function markPreferencesComplete() {
    hasCompletedPreferences = true;
    saveProfileToLocal();
    updateNavAccess();
}

function updateNavAccess() {
    const navPlan = document.getElementById('navPlan');
    const navShopping = document.getElementById('navShopping');
    const navProgress = document.getElementById('navProgress');
    
    if (navPlan) {
        navPlan.style.opacity = hasCompletedPreferences ? '1' : '0.5';
    }
    if (navShopping) {
        navShopping.style.opacity = hasCompletedPreferences ? '1' : '0.5';
    }
    if (navProgress) {
        navProgress.style.opacity = hasCompletedPreferences ? '1' : '0.5';
    }
}

/* ═══ STREAK & COMPLETION TRACKING ═══ */
function markWeeklyPlanComplete() {
    const today = new Date().toDateString();
    
    // Check if already completed this week
    if (lastPlanCompletionDate === today && weeklyPlanCompleted) {
        toast('You already completed this week\'s plan! Keep it up! 🎉');
        return;
    }
    
    // Mark as completed
    weeklyPlanCompleted = true;
    lastPlanCompletionDate = today;
    
    // Update streak logic
    const lastCompletion = userProfile?.lastPlanCompletion;
    const streakMsg = document.getElementById('streakMsg');
    
    if (!lastCompletion || !isSameWeek(new Date(lastCompletion), new Date())) {
        // New week - check if streak continues
        if (userProfile) {
            userProfile.streak_count = (userProfile.streak_count || 0) + 1;
            userProfile.lastPlanCompletion = today;
            if (userProfile.streak_count > (userProfile.longest_streak || 0)) {
                userProfile.longest_streak = userProfile.streak_count;
            }
            saveProfileToLocal();
            updateGamificationUI();
            
            // Show celebration
            if (userProfile.streak_count > 1) {
                toast('🔥 ' + userProfile.streak_count + ' Week Streak! Amazing!');
            }
        }
        
        if (streakMsg) {
            streakMsg.textContent = 'Week complete! Your streak is alive!';
        }
    }
    
    saveProfileToLocal();
    toast('✅ Weekly plan saved! +21 meals 🍽️');
}

function isSameWeek(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < 7;
}

function checkWeeklyStatus() {
    // Check if current week's plan is completed
    const today = new Date().toDateString();
    const storedDate = userProfile?.lastPlanCompletion;
    
    if (storedDate && isSameWeek(new Date(storedDate), new Date())) {
        weeklyPlanCompleted = true;
        lastPlanCompletionDate = storedDate;
        return true;
    }
    weeklyPlanCompleted = false;
    return false;
}

function addCompletePlanButton() {
    // Add a "Complete This Week" button to the plan page
    const plh = document.querySelector('.plh');
    if (plh && !document.getElementById('completePlanBtn')) {
        const btn = document.createElement('button');
        btn.id = 'completePlanBtn';
        btn.className = 'bp';
        btn.style.marginLeft = '0.5rem';
        btn.style.background = weeklyPlanCompleted ? '#ccc' : 'linear-gradient(135deg, #FFD700, #FF6B35)';
        btn.textContent = weeklyPlanCompleted ? '✓ Week Complete!' : '✓ Complete This Week';
        btn.onclick = markWeeklyPlanComplete;
        btn.disabled = weeklyPlanCompleted;
        plh.appendChild(btn);
    }
}

/* ═══ LANDING PAGE FUNCTIONS ═══ */
function scrollToCrew() {
    const crew = document.getElementById('crewSection');
    if (crew) {
        crew.scrollIntoView({ behavior: 'smooth' });
    }
}

async function handleSignup(event) {
    event.preventDefault();
    showAuthLoading(true);
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    try {
        const data = await apiCall('/api/signup', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
        
        currentUser = { id: data.user.id, email: data.user.email };
        userProfile = { ...data.user };
        localStorage.setItem('yumbot_user_id', data.user.id);
        
        showAuthSuccess('Account created! Welcome, ' + name + '!');
        closeAuthModal();
        showMainApp();
        updateGamificationUI();
        toast('Welcome, ' + name + '!');
        show('home');
    } catch (err) {
        showAuthError(err.message);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    showAuthLoading(true);
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const data = await apiCall('/api/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        currentUser = { id: data.user.id, email: data.user.email };
        userProfile = data.user;
        hasCompletedPreferences = data.user.hasCompletedPreferences || false;
        localStorage.setItem('yumbot_user_id', data.user.id);
        
        closeAuthModal();
        showMainApp();
        updateGamificationUI();
        toast('Welcome back, ' + (data.user.display_name || 'User') + '!');
        show('home');
    } catch (err) {
        showAuthError(err.message);
    }
}

function handleLogout() {
    currentUser = null;
    userProfile = null;
    localStorage.removeItem('yumbot_user_id');
    updateUIForLoggedOutUser();
    toast('Logged out');
}

function openAuthModal() {
    if (currentUser) {
        showProfileMenu();
    } else {
        document.getElementById('authModal').style.display = 'flex';
        showLogin();
    }
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('authError').style.display = 'none';
    document.getElementById('authLoading').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
}

function showLogin() {
    currentAuthForm = 'login';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('authError').style.display = 'none';
}

function showSignup() {
    currentAuthForm = 'signup';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
    document.getElementById('authError').style.display = 'none';
}

function showAuthLoading(show) {
    document.getElementById('authLoading').style.display = show ? 'block' : 'none';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'none';
}

function showAuthError(msg) {
    const el = document.getElementById('authError');
    el.textContent = msg;
    el.style.color = '#e74c3c';
    el.style.background = '#fdf2f2';
    el.style.display = 'block';
    document.getElementById('authLoading').style.display = 'none';
    
    if (currentAuthForm === 'login') {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('signupForm').style.display = 'none';
    } else {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'block';
    }
}

function showAuthSuccess(msg) {
    const el = document.getElementById('authError');
    el.textContent = msg;
    el.style.color = '#2ecc71';
    el.style.background = '#e8f8f0';
    el.style.display = 'block';
    document.getElementById('authLoading').style.display = 'none';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'none';
    
    setTimeout(function() {
        closeAuthModal();
    }, 3000);
}

function showProfileMenu() {
    const name = userProfile?.display_name || currentUser?.email || 'User';
    const choice = prompt('Logged in as: ' + name + '\n\n1 = Admin Panel\n2 = Logout\n\nEnter choice:');
    if (choice === '1') {
        show('admin');
    } else if (choice === '2') {
        handleLogout();
    }
}

function updateUIForLoggedInUser() {
    showMainApp();
}

function updateUIForLoggedOutUser() {
    // Show landing page, hide main app
    const landing = document.getElementById('page-landing');
    const mainHeader = document.getElementById('mainHeader');
    const mainContent = document.getElementById('mainContent');
    const mainFooter = document.getElementById('mainFooter');
    if (landing) landing.style.display = 'block';
    if (mainHeader) mainHeader.style.display = 'none';
    if (mainContent) mainContent.style.display = 'none';
    if (mainFooter) mainFooter.style.display = 'none';
    
    const authBtn = document.getElementById('authBtn');
    if (authBtn) {
        authBtn.textContent = 'Sign In';
        authBtn.onclick = openAuthModal;
    }
    
    const gamiQuick = document.getElementById('gamiQuick');
    const homeStreak = document.getElementById('homeStreak');
    if (gamiQuick) gamiQuick.style.display = 'none';
    if (homeStreak) homeStreak.style.display = 'none';
}

function updateGamificationUI() {
    if (!userProfile) return;
    const streak = userProfile.streak_count || 0;
    const mastery = userProfile.mastery_level || 0;
    const meals = userProfile.total_meals_planned || 0;
    
    const els = ['quickStreak', 'quickMastery', 'quickMeals', 'streakNumHome'];
    if (document.getElementById('quickStreak')) document.getElementById('quickStreak').textContent = streak;
    if (document.getElementById('quickMastery')) document.getElementById('quickMastery').textContent = mastery + '%';
    if (document.getElementById('quickMeals')) document.getElementById('quickMeals').textContent = meals;
    if (document.getElementById('streakNumHome')) document.getElementById('streakNumHome').textContent = streak;
    
    if (document.getElementById('dashStreak')) document.getElementById('dashStreak').textContent = streak;
    if (document.getElementById('masteryPercent')) document.getElementById('masteryPercent').textContent = mastery + '%';
    if (document.getElementById('statMeals')) document.getElementById('statMeals').textContent = meals;
    if (document.getElementById('statLongest')) document.getElementById('statLongest').textContent = userProfile.longest_streak || 0;
    
    updateMasteryCircle(mastery);
    updateStreakProgress(streak);
    updateMasteryLevel(mastery);
}

function updateMasteryCircle(percent) {
    const circle = document.getElementById('masteryCircle');
    if (circle) {
        const circumference = 283;
        circle.style.strokeDashoffset = circumference - (percent / 100) * circumference;
    }
}

function updateStreakProgress(current) {
    const badges = [{ name: 'Week Warrior', required: 2 }, { name: 'Five Week Champion', required: 5 }];
    let nextBadge = badges.find(b => b.required > current) || { name: 'Max Level!', required: current };
    
    if (document.getElementById('streakProgress')) {
        document.getElementById('streakProgress').style.width = Math.min((current / nextBadge.required) * 100, 100) + '%';
    }
    if (document.getElementById('nextBadgeName')) document.getElementById('nextBadgeName').textContent = nextBadge.name;
    if (document.getElementById('streakCurrent')) document.getElementById('streakCurrent').textContent = current;
    if (document.getElementById('streakNeeded')) document.getElementById('streakNeeded').textContent = nextBadge.required;
}

function updateMasteryLevel(percent) {
    let level = 'Beginner Chef', next = 'Intermediate Chef';
    if (percent >= 100) { level = 'Dietary Master'; next = 'Maximum!'; }
    else if (percent >= 75) { level = 'Expert Chef'; next = 'Dietary Master'; }
    else if (percent >= 50) { level = 'Intermediate Chef'; next = 'Expert Chef'; }
    else if (percent >= 25) { level = 'Home Cook'; next = 'Intermediate Chef'; }
    
    if (document.getElementById('masteryLevel')) document.getElementById('masteryLevel').textContent = level;
    if (document.getElementById('nextMastery')) document.getElementById('nextMastery').textContent = next;
}

async function loadBadges() {
    const defaultBadges = [
        { badge_key: 'first_week', name: 'First Week Hero', icon: '🌱' },
        { badge_key: 'week_2', name: 'Week Warrior', icon: '🥗' },
        { badge_key: 'week_5', name: 'Five Week Champion', icon: '🔥' },
        { badge_key: 'meals_21', name: 'Full Week Warrior', icon: '🍽️' },
        { badge_key: 'variety_10', name: 'Variety Seeker', icon: '🔄' },
        { badge_key: 'mastery_50', name: 'Halfway Master', icon: '📊' },
        { badge_key: 'social_first', name: 'Social Starter', icon: '👏' },
        { badge_key: 'streak_10', name: 'Dedication Award', icon: '🏆' }
    ];
    renderBadges(defaultBadges, []);
}

function renderBadges(badges, earnedIds) {
    const grid = document.getElementById('badgesGrid');
    if (!grid) return;
    if (!badges.length) {
        grid.innerHTML = '<p style="color:#999;text-align:center">Start your journey to earn badges!</p>';
        return;
    }
    grid.innerHTML = badges.map(badge => {
        const earned = earnedIds.includes(badge.id);
        return '<div class="badge-item ' + (earned ? 'earned' : 'locked') + '"><div class="badge-icon">' + (earned ? badge.icon : '🔒') + '</div><div class="badge-name">' + badge.name + '</div></div>';
    }).join('');
    
    if (document.getElementById('quickBadges')) document.getElementById('quickBadges').textContent = earnedIds.length;
}

function handleMainCTA() {
    if (!currentUser) {
        toast('Sign up to get your personalized meal plan!');
        openAuthModal();
    } else {
        show('profile');
    }
}

async function saveMealPlanWithGamification() {
    if (!currentUser && !userProfile) return;
    
    if (!userProfile) userProfile = { streak_count: 0, longest_streak: 0, mastery_level: 0, total_meals_planned: 0, badges: [], kudos_given: 0 };
    userProfile.total_meals_planned += 21;
    userProfile.streak_count += 1;
    if (userProfile.streak_count > userProfile.longest_streak) userProfile.longest_streak = userProfile.streak_count;
    
    // Save meal plan
    let mealPlans = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEAL_PLANS) || '[]');
    mealPlans.push({
        user_id: currentUser ? currentUser.id : 'local',
        week_start: new Date().toISOString().split('T')[0],
        meals: S.yearPlan,
        created_at: new Date().toISOString()
    });
    localStorage.setItem(STORAGE_KEYS.MEAL_PLANS, JSON.stringify(mealPlans));
    
    saveProfileToLocal();
    updateGamificationUI();
    loadBadges();
    toast('Meal plan saved!');
}

/* ═══ ORIGINAL YUMBOT APP CODE ═══ */
var S = { p: 2, c: 'beginner', diets: [], alls: [], star: 0, plan: null, yearPlan: {}, allWeeks: [], currentWeek: 0 };
var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
var SLBLS = ['', 'Not great', 'It was okay', 'Pretty good', 'Really liked it', 'Absolutely loved it!'];

var DG = {
'Plant-Based': ['Vegan', 'Vegetarian', 'Pescatarian', 'Flexitarian'],
'Avoid Ingredients': ['Gluten-Free', 'Dairy-Free', 'Egg-Free', 'Nut-Free', 'Soy-Free', 'Shellfish-Free'],
'Cultural & Religious': ['Halal', 'Kosher', 'Jain', 'Indian Vegetarian'],
'World Cuisines': ['Mediterranean', 'East Asian', 'West African', 'Middle Eastern', 'Latin American'],
'Health & Fitness': ['High-Protein', 'High-Fibre', 'Keto', 'Low-Carb', 'Low-Fat', 'Low-Calorie'],
'Medical Diets': ['Low-FODMAP', 'Diabetic-Friendly', 'Heart-Healthy', 'Kidney-Friendly', 'Anti-Inflammatory'],
'Eating Styles': ['Paleo', 'Whole30', 'Raw Food', 'DASH Diet'],
'Life Stage': ['Baby-Toddler', 'Kids', 'Teen-Friendly', 'Senior-Friendly', 'Pregnancy-Safe'],
'Lifestyle': ['Budget-Friendly', 'Student Meals', 'One-Pot Meals', '5-Ingredient', 'Meal-Prep']
};
var ALLS = ['Gluten', 'Dairy', 'Eggs', 'Peanuts', 'Tree Nuts', 'Soy', 'Fish', 'Shellfish', 'Sesame'];

var R = {
 breakfast: [
{n:'Creamy Blueberry Porridge', t:10, d:'Easy', c:'British', hot:false, tags:['Vegetarian','High-Fibre'], img:'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=600&h=400&fit=crop', vidId:'B0nTWpAoizo', ing:['100g rolled oats','400ml whole milk','100g fresh blueberries','1 tbsp honey','Pinch of salt'], steps:['Bring milk to a gentle simmer in a saucepan.','Add oats and salt, stir constantly 4-5 minutes until thick and creamy.','Spoon into bowls, top with blueberries and drizzle with honey.']},
{n:'Avocado Toast & Poached Egg', t:10, d:'Easy', c:'Modern', hot:false, tags:['Vegetarian'], img:'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=600&h=400&fit=crop', vidId:'xdZ4oYzBOJg', ing:['2 slices sourdough','1 ripe avocado','2 large eggs','Lemon juice','Chilli flakes','Salt and pepper'], steps:['Toast bread until golden and crisp.','Mash avocado with lemon juice, salt, and pepper.','Poach eggs 3 minutes in simmering water. Lay on toast, add chilli flakes.']},
{n:'Shakshuka', t:25, d:'Easy', c:'Middle Eastern', hot:true, tags:['Vegetarian','Gluten-Free'], img:'https://images.unsplash.com/photo-1590412200988-a436970781fa?w=600&h=400&fit=crop', vidId:'PEsMSwY0vgo', ing:['4 large eggs','2x400g tins chopped tomatoes','1 red pepper','1 onion','3 garlic cloves','1 tsp cumin','1 tsp smoked paprika','Fresh coriander'], steps:['Fry onion, pepper, and garlic in olive oil for 5 minutes.','Add spices and tomatoes. Simmer 10 minutes until thick.','Make 4 wells, crack in eggs, cover until whites set. Top with coriander.']},
{n:'Overnight Chia Pudding', t:5, d:'Easy', c:'Modern', hot:false, tags:['Vegan','Gluten-Free'], img:'https://images.unsplash.com/photo-1474710152274-77a5f7a4ff2a?w=600&h=400&fit=crop', vidId:'V73h4yhLVhA', ing:['3 tbsp chia seeds','200ml oat milk','1 tsp vanilla','1 tbsp maple syrup','Seasonal fruit to top'], steps:['Mix chia seeds, oat milk, vanilla, and maple syrup in a jar.','Refrigerate overnight for at least 6 hours.','Stir in the morning and top with fresh fruit.']},
{n:'Keto Bacon & Eggs', t:10, d:'Easy', c:'British', hot:true, tags:['Keto','Low-Carb','Gluten-Free'], img:'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=600&h=400&fit=crop', vidId:'XgTx5lXgaqQ', ing:['3 rashers smoked back bacon','2 large eggs','1/2 ripe avocado','Knob of butter','Salt and pepper'], steps:['Fry bacon in a hot pan until the edges are crisp.','Melt butter in the same pan, cook eggs sunny-side up.','Serve alongside sliced avocado and cracked black pepper.']},
{n:'Vegan Smoothie Bowl', t:5, d:'Easy', c:'Modern', hot:false, tags:['Vegan','Gluten-Free'], img:'https://images.pexels.com/photos/34227827/pexels-photo-34227827.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop', vidId:'3LoGRXiGWAk', ing:['1 frozen banana','1/2 cup frozen mango','100ml oat milk','2 tbsp granola','1 tbsp chia seeds','Fresh strawberries'], steps:['Blend banana, mango, and oat milk until thick.','Pour into a chilled bowl.','Top with granola, chia seeds, and strawberries.']},
{n:'Japanese Tamagoyaki', t:15, d:'Medium', c:'Japanese', hot:true, tags:['Gluten-Free','High-Protein'], img:'https://images.unsplash.com/photo-1607330289024-1535c6b4e1c1?w=600&h=400&fit=crop', vidId:'U21GQ0Xgx_0', ing:['4 eggs','1 tbsp dashi stock','1 tbsp soy sauce','1 tsp sugar','Vegetable oil'], steps:['Whisk eggs with dashi, soy sauce, and sugar.','Heat a rectangular pan, lightly oil. Pour thin layer of egg.','Roll and push to one side. Repeat layers. Slice and serve.']}
 ],
 lunch: [
{n:'Vegan Chickpea Curry', t:30, d:'Easy', c:'Indian', hot:true, tags:['Vegan','Gluten-Free','High-Protein','Halal'], img:'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&h=400&fit=crop', vidId:'mJTtPb2CIUM', ing:['2x400g tins chickpeas','400g tin chopped tomatoes','400ml tin coconut milk','1 onion','4 garlic cloves','2 tsp curry powder','1 tsp turmeric','Coriander and rice'], steps:['Fry onion and garlic until golden, about 7 minutes.','Add spices, fry 2 minutes. Add tomatoes, coconut milk, chickpeas.','Simmer 20 minutes. Serve over rice with coriander.']},
{n:'Falafel Wrap', t:20, d:'Easy', c:'Middle Eastern', hot:false, tags:['Vegan','High-Protein','Halal'], img:'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&h=400&fit=crop', vidId:'b2ypY6L1HLY', ing:['8 falafels','2 large flatbreads','4 tbsp hummus','Baby gem lettuce','2 tomatoes','Tahini sauce and lemon'], steps:['Heat falafels at 200C for 8 minutes until crisp.','Warm flatbreads in a dry pan 30 seconds each side.','Spread hummus, add salad, falafel, drizzle tahini and lemon.']},
{n:'Paneer Tikka Wrap', t:25, d:'Medium', c:'Indian', hot:true, tags:['Vegetarian','High-Protein'], img:'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&h=400&fit=crop', vidId:'fohA4X5pYSg', ing:['250g paneer, cubed','2 flatbreads','150g yogurt','1 tsp each cumin, turmeric, garam masala','Cucumber, fresh mint, lemon'], steps:['Mix half the yogurt with spices. Coat paneer. Marinate 15 minutes.','Grill on highest heat 3-4 minutes each side until charred.','Stir cucumber and mint into remaining yogurt. Serve in wraps with raita.']},
{n:'West African Groundnut Soup', t:40, d:'Medium', c:'West African', hot:true, tags:['Vegan','Gluten-Free','Halal'], img:'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&h=400&fit=crop', vidId:'5AVTk_x1_sA', ing:['3 tbsp peanut butter','2 sweet potatoes, cubed','400g tin chopped tomatoes','1 litre veg stock','1 onion','1 tsp chilli flakes','Fresh coriander'], steps:['Fry onion and garlic until golden. Add sweet potato, tomatoes, stock, chilli.','Simmer 25 minutes until potato is very tender.','Stir in peanut butter until dissolved. Top with coriander.']},
{n:'Tuna Niçoise Salad', t:20, d:'Easy', c:'French', hot:false, tags:['Gluten-Free','Pescatarian'], img:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop', vidId:'tvWVPj5eW4Y', ing:['2x145g tins tuna in olive oil','2 large eggs','150g fine green beans','4 small new potatoes','Kalamata olives','Dijon, olive oil, red wine vinegar'], steps:['Boil potatoes 12 mins, add eggs for last 7. Blanch beans 3 mins.','Whisk 1 tsp Dijon, 2 tbsp oil, 1 tbsp vinegar. Season well.','Arrange everything in bowls and drizzle with dressing.']},
{n:'Thai Green Curry', t:30, d:'Medium', c:'Thai', hot:true, tags:['Vegan','Gluten-Free','Halal'], img:'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop', vidId:'rTK8MWYYLko', ing:['400ml coconut milk','3 tbsp green curry paste','400g mixed vegetables','200g tofu or chicken','Thai basil, lime, fish sauce'], steps:['Heat coconut milk, add curry paste and stir until fragrant.','Add vegetables and protein, simmer 15 minutes.','Season with lime juice and fish sauce. Serve with rice.']},
{n:'Japanese Teriyaki Chicken Bowl', t:25, d:'Easy', c:'Japanese', hot:true, tags:['High-Protein','Halal'], img:'https://images.unsplash.com/photo-1525755662778-989d05240894?w=600&h=400&fit=crop', vidId:'hAxv7f6FWVs', ing:['400g chicken breast','3 tbsp soy sauce','2 tbsp mirin','1 tbsp honey','Broccoli, rice'], steps:['Mix soy sauce, mirin and honey for teriyaki sauce.','Pan-fry chicken until golden, add sauce and glaze.','Serve over rice with steamed broccoli.']},
{n:'Mexican Burrito Bowl', t:25, d:'Easy', c:'Mexican', hot:false, tags:['Vegetarian','Gluten-Free','High-Protein'], img:'https://images.pexels.com/photos/10696501/pexels-photo-10696501.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop', vidId:'RMBti8WALKQ', ing:['200g cooked rice','200g black beans','Corn, peppers, avocado','Salsa, cheese','Lime and coriander'], steps:['Warm rice and black beans with cumin.','Arrange in bowl with corn, peppers and sliced avocado.','Top with salsa, cheese, lime juice and coriander.']}
 ],
 dinner: [
{n:'Baked Salmon & Roasted Veg', t:30, d:'Easy', c:'Modern', hot:true, tags:['Pescatarian','Gluten-Free','High-Protein','Keto'], img:'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=400&fit=crop', vidId:'PdqgZz5qnJc', ing:['2x180g salmon fillets','1 courgette, 1 red pepper, 1 red onion','Olive oil, lemon, fresh dill','Sea salt and pepper'], steps:['Preheat oven to 200C. Roast chopped veg in oil for 10 minutes.','Nestle salmon among veg, season, add lemon slices.','Roast 12-15 minutes until salmon flakes easily. Scatter with dill.']},
{n:'Chicken Tikka Masala', t:40, d:'Medium', c:'Indian', hot:true, tags:['Gluten-Free','High-Protein','Halal'], img:'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&h=400&fit=crop', vidId:'ysUumkRFP8I', ing:['600g chicken breast, cubed','400g tin chopped tomatoes','150ml double cream','1 onion','4 garlic cloves','2 tbsp tikka masala paste','Coriander and rice'], steps:['Coat chicken in tikka paste. Grill until charred in places, about 8 minutes.','Fry onion and garlic until deeply golden. Add tomatoes, simmer 10 minutes.','Pour in cream, stir in chicken. Simmer 10 minutes. Serve with rice.']},
{n:'One-Pot Mushroom Risotto', t:35, d:'Medium', c:'Italian', hot:true, tags:['Vegetarian','Gluten-Free','One-Pot'], img:'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&h=400&fit=crop', vidId:'8ak3lUxy_yU', ing:['300g mixed mushrooms','200g arborio rice','1 litre warm veg stock','1 glass white wine','1 shallot, 2 garlic cloves','50g parmesan, 30g cold butter','Fresh parsley'], steps:['Fry shallot until soft. Add mushrooms, cook until golden.','Add rice, stir 1 minute. Pour in wine, stir until absorbed.','Add stock ladle by ladle, stirring 18-20 mins. Beat in butter and parmesan.']},
{n:'Caribbean Jerk Chicken', t:50, d:'Medium', c:'Caribbean', hot:true, tags:['Gluten-Free','High-Protein','Halal'], img:'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&h=400&fit=crop', vidId:'AFzx37MGW6o', ing:['4 chicken leg quarters','3 tbsp jerk seasoning paste','Juice of 2 limes','Olive oil, fresh thyme','Rice and peas to serve'], steps:['Score chicken deeply. Rub all over with jerk paste and lime. Marinate 1+ hour.','Roast at 200C for 40-45 minutes until deeply caramelised.','Rest 5 minutes. Serve with rice and peas.']},
{n:'Pasta Aglio e Olio', t:15, d:'Easy', c:'Italian', hot:true, tags:['Vegetarian','Budget-Friendly'], img:'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600&h=400&fit=crop', vidId:'tHXlfuQc_A8', ing:['200g spaghetti','6 garlic cloves, thinly sliced','5 tbsp extra virgin olive oil','1 tsp chilli flakes','Handful flat-leaf parsley'], steps:['Cook spaghetti until al dente. Reserve 150ml pasta water.','Warm oil. Gently fry garlic on lowest heat until just golden.','Add chilli, pasta, pasta water. Toss vigorously. Add parsley and serve immediately.']},
{n:'Black Bean Tacos', t:20, d:'Easy', c:'Mexican', hot:false, tags:['Vegan','Gluten-Free','Budget-Friendly'], img:'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&h=400&fit=crop', vidId:'9M6bi7fE29o', ing:['2x400g tins black beans','8 corn tortillas','1 ripe avocado','2 tomatoes, diced','1 lime, 1 tsp cumin, 1 tsp paprika','Fresh coriander and jalapeno'], steps:['Fry beans with cumin and paprika 5 minutes until slightly caramelised.','Dice tomatoes, coriander, jalapeno, squeeze lime - make salsa.','Warm tortillas. Fill with beans, avocado, and salsa.']},
{n:'Japanese Ramen', t:45, d:'Medium', c:'Japanese', hot:true, tags:['High-Protein'], img:'https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=600&h=400&fit=crop', vidId:'bNT7mnMKYjI', ing:['400g ramen noodles','1 litre pork or chicken stock','2 soft-boiled eggs','Chashu pork or tofu','Nori, spring onions, corn'], steps:['Prepare tare (seasoning base) and mix with hot stock.','Cook ramen noodles according to package.','Assemble bowl with noodles, stock, egg, protein and toppings.']}
 ]
};

function tc(t) {
if (t === 'Vegan' || t === 'Vegetarian') return 'tg';
if (t === 'Halal' || t === 'Kosher') return 'ty';
if (t.indexOf('Free') > -1 || t === 'Keto' || t === 'One-Pot') return 'tp';
return 'tr';
}

function getMonthName(m) { var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']; return months[m]; }

function show(page) {
  // Handle landing page visibility
  const landing = document.getElementById('page-landing');
  const mainHeader = document.getElementById('mainHeader');
  const mainContent = document.getElementById('mainContent');
  const mainFooter = document.getElementById('mainFooter');
  
  if (!currentUser) {
    // Not logged in - show landing page only
    if (landing) landing.style.display = 'block';
    if (mainHeader) mainHeader.style.display = 'none';
    if (mainContent) mainContent.style.display = 'none';
    if (mainFooter) mainFooter.style.display = 'none';
    if (page !== 'landing') {
      show('landing');
    }
    return;
  }
  
  // Logged in - show main app
  if (landing) landing.style.display = 'none';
  if (mainHeader) mainHeader.style.display = 'block';
  if (mainContent) mainContent.style.display = 'block';
  if (mainFooter) mainFooter.style.display = 'block';
  
  document.querySelectorAll('.page').forEach(function(x) { x.classList.remove('active'); });
  document.querySelectorAll('.nb').forEach(function(b) { b.classList.remove('on'); });
  document.getElementById('page-' + page).classList.add('active');
  
  // Update nav active state
  const navBtns = document.querySelectorAll('.nb');
  navBtns.forEach(function(btn) {
    if (btn.textContent.includes('Home') && page === 'home') btn.classList.add('on');
    if (btn.textContent.includes('Preferences') && page === 'profile') btn.classList.add('on');
    if (btn.textContent.includes('Meal Plan') && page === 'plan') btn.classList.add('on');
    if (btn.textContent.includes('Shopping') && page === 'shopping') btn.classList.add('on');
    if (btn.textContent.includes('Progress') && page === 'progress') btn.classList.add('on');
    if (btn.textContent.includes('Feedback') && page === 'feedback') btn.classList.add('on');
  });
  
  if (page === 'plan') {
    if (Object.keys(S.yearPlan).length === 0) {
      buildYearPlan();
    } else {
      // Navigate to current week by default
      goToCurrentWeek();
      renderYearPlan();
    }
    // Add complete plan button
    setTimeout(addCompletePlanButton, 100);
  }
  if (page === 'shopping') buildShop();
  if (page === 'progress') loadBadges();
  document.getElementById('nav').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function buildHomeGrid() {
var g = document.getElementById('home-grid');
var picks = [R.breakfast[2], R.lunch[0], R.dinner[1], R.dinner[2]];
var html = '';
picks.forEach(function(r) {
var tags = '';
r.tags.slice(0, 2).forEach(function(t) { tags += '<span class="mtag ' + tc(t) + '">' + t + '</span>'; });
html += '<div class="mc" onclick="showRecipe(findRecipe(\'' + r.n.replace(/'/g, "\\'") + '\'))"><div class="mc-img"><img src="' + r.img + '" alt="' + r.n + '" loading="lazy" onerror="this.src=\'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop\'"></div><div class="mtags">' + tags + '</div><div class="mc-body"><div class="mc-cuis">' + r.c + '</div><div class="mc-name">' + r.n + '</div><div class="mc-meta"><span>' + r.t + ' mins</span><span>' + r.d + '</span></div></div></div>';
});
g.innerHTML = html;
}

function buildDPBand() {
var html = '';
Object.keys(DG).forEach(function(g) {
html += '<span class="gl">' + g + '</span>';
DG[g].forEach(function(d) { html += '<span class="dp">' + d + '</span>'; });
});
document.getElementById('dp-band').innerHTML = html;
}

function nxt(n) {
document.querySelectorAll('.wst').forEach(function(s) { s.classList.remove('active'); });
document.getElementById('ws' + n).classList.add('active');
['wp1', 'wp2', 'wp3'].forEach(function(id, i) {
var el = document.getElementById(id);
el.classList.remove('on', 'done');
if (i + 1 === n) el.classList.add('on');
else if (i + 1 < n) el.classList.add('done');
});
if (n === 2) buildDG();
if (n === 3) buildAG();
window.scrollTo({ top: 100, behavior: 'smooth' });
}

function setP(n, btn) { S.p = n; document.querySelectorAll('#pr .cb').forEach(function(b) { b.classList.remove('on'); }); btn.classList.add('on'); }
function setC(c, btn) { S.c = c; document.querySelectorAll('#cfr .cb').forEach(function(b) { b.classList.remove('on'); }); btn.classList.add('on'); }

function buildDG() {
var h = '';
Object.keys(DG).forEach(function(g) {
h += '<span class="gl">' + g + '</span>';
DG[g].forEach(function(d) {
var sel = S.diets.indexOf(d) > -1 ? 'sel' : '';
h += '<button class="dc ' + sel + '" onclick="togD(\'' + d.replace(/'/g, "\\'") + '\',this)">' + d + '</button>';
});
});
document.getElementById('dg').innerHTML = h;
}

function togD(d, btn) {
if (S.diets.indexOf(d) > -1) S.diets = S.diets.filter(function(x) { return x !== d; });
else S.diets.push(d);
btn.classList.toggle('sel', S.diets.indexOf(d) > -1);
}

function buildAG() {
var h = '';
ALLS.forEach(function(a) {
var sel = S.alls.indexOf(a) > -1 ? 'sel' : '';
h += '<button class="ac ' + sel + '" onclick="togA(\'' + a + '\',this)">' + a + '</button>';
});
document.getElementById('ag').innerHTML = h;
}

function togA(a, btn) {
if (S.alls.indexOf(a) > -1) S.alls = S.alls.filter(function(x) { return x !== a; });
else S.alls.push(a);
btn.classList.toggle('sel', S.alls.indexOf(a) > -1);
}

function saveP() {
    toast('Preferences saved! Building your plan...');
    markPreferencesComplete();
    S.plan = null;
    S.yearPlan = {};
    S.allWeeks = [];
    S.currentWeek = 0;
    setTimeout(function() { 
        show('plan'); 
        if (currentUser || localStorage.getItem('yumbot_profile')) {
            setTimeout(saveMealPlanWithGamification, 2000);
        }
    }, 500);
}

function initYearSelector() {
var yearSelect = document.getElementById('yearSelect');
var now = new Date();
for (var y = now.getFullYear(); y <= now.getFullYear() + 1; y++) {
var opt = document.createElement('option');
opt.value = y;
opt.textContent = y;
if (y === now.getFullYear()) opt.selected = true;
yearSelect.appendChild(opt);
}
}

function updateYearDisplay() {
var year = parseInt(document.getElementById('yearSelect').value);
document.getElementById('dateDisplay').textContent = year;
S.currentWeek = 0;
buildYearPlan();
}

function getWeeksInYear(year) {
  var weeks = [];
  var jan1 = new Date(year, 0, 1);
  var dayOfWeek = jan1.getDay() === 0 ? 6 : jan1.getDay() - 1;
  var firstMonday = new Date(jan1);
  firstMonday.setDate(jan1.getDate() - dayOfWeek);

  var weekStart = new Date(firstMonday);
  for (var w = 0; w < 53; w++) {
    var weekDays = [];
    var hasDateInYear = false;
    for (var d = 0; d < 7; d++) {
      var curr = new Date(weekStart);
      curr.setDate(weekStart.getDate() + (w * 7) + d);
      var inYear = curr.getFullYear() === year;
      if (inYear) hasDateInYear = true;
      var dayIndex = curr.getDay() === 0 ? 6 : curr.getDay() - 1;
      weekDays.push({
        dayName: DAYS[dayIndex],
        date: curr.getDate(),
        month: getMonthName(curr.getMonth()),
        year: curr.getFullYear(),
        fullDate: curr
      });
    }
    if (!hasDateInYear) break;
    var startInfo = weekDays[0];
    var endInfo = weekDays[6];
    var rangeLabel = startInfo.month.substring(0, 3) + ' ' + startInfo.date + ' - ' + endInfo.month.substring(0, 3) + ' ' + endInfo.date;
    weeks.push({ weekNum: weeks.length + 1, days: weekDays, startDate: rangeLabel });
  }
  return weeks;
}

function pick(arr, used) {
used = used || [];
var filtered = arr.filter(function(r) { return used.indexOf(r.n) === -1; });
if (filtered.length === 0) return arr[Math.floor(Math.random() * arr.length)];
return filtered[Math.floor(Math.random() * filtered.length)];
}

function buildYearPlan() {
  var year = parseInt(document.getElementById('yearSelect').value);
  var weeks = getWeeksInYear(year);
  S.yearPlan = {};
  S.allWeeks = weeks;
  var usedBreakfast = [], usedLunch = [], usedDinner = [];
  weeks.forEach(function(week) {
    var weekLabel = 'Week ' + week.weekNum;
    S.yearPlan[weekLabel] = {};
    week.days.forEach(function(dayData) {
      var dayName = dayData.dayName;
      var b = pick(R.breakfast, usedBreakfast);
      var l = pick(R.lunch, usedLunch);
      var d = pick(R.dinner, usedDinner);
      usedBreakfast.push(b.n);
      usedLunch.push(l.n);
      usedDinner.push(d.n);
      S.yearPlan[weekLabel][dayName] = { breakfast: b, lunch: l, dinner: d };
    });
  });
  
  // Go to current week by default
  goToCurrentWeek();
  renderYearPlan();
}

function goToCurrentWeek() {
    // Find current week index
    var today = new Date();
    var currentWeekIndex = 0;
    
    for (var i = 0; i < S.allWeeks.length; i++) {
        var weekDays = S.allWeeks[i].days;
        for (var j = 0; j < weekDays.length; j++) {
            var weekDate = weekDays[j].fullDate;
            if (weekDate.toDateString() === today.toDateString()) {
                currentWeekIndex = i;
                break;
            }
        }
    }
    
    // Also check if today falls in the week
    var todayTime = today.getTime();
    for (var i = 0; i < S.allWeeks.length; i++) {
        var startDate = S.allWeeks[i].days[0].fullDate;
        var endDate = S.allWeeks[i].days[6].fullDate;
        if (todayTime >= startDate.getTime() && todayTime <= endDate.getTime()) {
            currentWeekIndex = i;
            break;
        }
    }
    
    S.currentWeek = currentWeekIndex;
    
    // Update year selector if needed
    var weekYear = S.allWeeks[currentWeekIndex]?.days[0]?.year;
    if (weekYear) {
        var yearSelect = document.getElementById('yearSelect');
        if (yearSelect && yearSelect.value != weekYear) {
            yearSelect.value = weekYear;
        }
    }
}

function findRecipe(name) {
var all = R.breakfast.concat(R.lunch).concat(R.dinner);
for (var i = 0; i < all.length; i++) {
if (all[i].n === name) return all[i];
}
return null;
}

function renderYearPlan() {
  var weeks = Object.keys(S.yearPlan);
  if (weeks.length === 0) return;
  if (S.currentWeek >= weeks.length) S.currentWeek = 0;
  var week = weeks[S.currentWeek];
  var weekData = S.yearPlan[week];
  var weekInfo = S.allWeeks[S.currentWeek];

  var navHtml = '<div class="week-nav"><button class="wnav-btn" onclick="prevWeek()">Previous Week</button><span class="wnav-title">' + week + ' - ' + weekInfo.startDate + '</span><button class="wnav-btn" onclick="nextWeek()">Next Week</button></div>';

  var daysHtml = '<div class="mp-week"><div class="mp-days-grid">';
  DAYS.forEach(function(day) {
    var dayData = weekInfo.days.find(function(d) { return d.dayName === day; });
    var meals = weekData[day];
    var dateDisplay = dayData ? dayData.date : '';
    var monthDisplay = dayData ? dayData.month.substring(0, 3) : '';
    daysHtml += '<div class="mp-day"><div class="mp-day-name"><span class="day-name">' + day.substring(0, 3) + '</span><span class="day-date">' + dateDisplay + '</span><span class="day-month">' + monthDisplay + '</span></div>';
    if (meals) {
      ['breakfast', 'lunch', 'dinner'].forEach(function(type) {
        var m = meals[type];
        daysHtml += '<div class="mp-meal"><div class="mp-meal-img" onclick="showRecipe(findRecipe(\'' + m.n.replace(/'/g, "\\'") + '\'))"><img src="' + m.img + '" alt="' + m.n + '" onerror="this.src=\'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=150&fit=crop\'"><button class="rotate-btn" onclick="event.stopPropagation();rotateMeal(' + S.currentWeek + ',\'' + day + '\',\'' + type + '\')" title="Try another option">↻</button></div><div class="mp-meal-info" onclick="showRecipe(findRecipe(\'' + m.n.replace(/'/g, "\\'") + '\'))"><div class="mp-meal-type">' + type + '</div><div class="mp-meal-name">' + m.n + '</div><div class="mp-meal-time">' + m.t + ' mins</div></div></div>';
      });
    }
    daysHtml += '</div>';
  });
  daysHtml += '</div></div>';

  var html = '<div class="mp-container">' + navHtml + daysHtml + '</div>';
  document.getElementById('pgrid').innerHTML = html;
  document.getElementById('mobplan').innerHTML = html;
}

function showWeek(idx) {
S.currentWeek = idx;
renderYearPlan();
}

function rotateMeal(weekIndex, day, mealType) {
  var weeks = Object.keys(S.yearPlan);
  var weekLabel = weeks[weekIndex];
  var weekData = S.yearPlan[weekLabel];
  var currentMeal = weekData[day][mealType];
  
  var recipeList = mealType === 'breakfast' ? R.breakfast : (mealType === 'lunch' ? R.lunch : R.dinner);
  
  var availableRecipes = recipeList.filter(function(r) { return r.n !== currentMeal.n; });
  
  if (availableRecipes.length > 0) {
    var newMeal = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
    S.yearPlan[weekLabel][day][mealType] = { n: newMeal.n, img: newMeal.img, t: newMeal.t };
    renderYearPlan();
  }
}

function prevWeek() {
  if (S.currentWeek > 0) {
    S.currentWeek--;
  } else {
    S.currentWeek = S.allWeeks.length - 1;
    var year = parseInt(document.getElementById('yearSelect').value);
    if (S.currentWeek > 0) {
      document.getElementById('yearSelect').value = S.allWeeks[0].days[0].year;
    }
  }
  renderYearPlan();
}

function nextWeek() {
  if (S.currentWeek < S.allWeeks.length - 1) {
    S.currentWeek++;
  } else {
    S.currentWeek = 0;
    var year = parseInt(document.getElementById('yearSelect').value);
    document.getElementById('yearSelect').value = year + 1;
    buildYearPlan();
    return;
  }
  renderYearPlan();
}

function showRecipe(r) {
if (!r) return;
show('recipe');
var tags = '';
r.tags.forEach(function(t) { tags += '<span class="mtag ' + tc(t) + '" style="font-size:.62rem">' + t + '</span>'; });
var ings = '';
(r.ing || []).forEach(function(i) { ings += '<li>' + i + '</li>'; });
var steps = '';
(r.steps || []).forEach(function(s) { steps += '<li>' + s + '</li>'; });
  var videoUrl = 'https://youtu.be/' + r.vidId;

document.getElementById('rcontent').innerHTML = '<div class="rhero"><img src="' + r.img + '" alt="' + r.n + '" onerror="this.src=\'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=500&fit=crop\'"></div><h1 class="rtitle">' + r.n + '</h1><div style="display:flex;gap:.55rem;flex-wrap:wrap;margin:.75rem 0 1.5rem">' + tags + '</div><div class="rpills"><div class="rpill"><strong>' + r.t + ' mins</strong>Cook time</div><div class="rpill"><strong>' + r.d + '</strong>Difficulty</div><div class="rpill"><strong>' + r.c + '</strong>Cuisine</div></div><div class="rl"><div><div class="rth">What you\'ll need</div><ul class="il">' + ings + '</ul></div><div><div class="rth">How to make it</div><ol class="sl">' + steps + '</ol></div></div><div style="margin-top:2rem;padding:1.5rem;background:#f8f9fa;border-radius:15px;text-align:center"><p style="margin-bottom:1rem;color:#666">Did you enjoy this recipe?</p><button class="kudos-btn" onclick="giveKudos(\'' + r.n + '\')">👏 Give Kudos</button></div><div class="vsec"><div class="vth">Watch how to make it</div><p class="vsub">Click the button below to watch the full video on YouTube</p><a href="' + videoUrl + '" target="_blank" rel="noopener" class="vcard"><div class="vplay"></div><div class="vtxt"><h4>' + r.n + '</h4><p>Watch step-by-step on YouTube</p></div></a></div>';
}

function giveKudos(recipeId) {
    const btn = event.target;
    if (btn.classList.contains('given')) return;
    if (!currentUser) {
        toast('Please sign in to give kudos!');
        openAuthModal();
        return;
    }
    btn.classList.add('given');
    btn.textContent = '✅ Given!';
    toast('Kudos given!');
    if (document.getElementById('statKudos')) {
        document.getElementById('statKudos').textContent = parseInt(document.getElementById('statKudos').textContent) + 1;
    }
}

var SMAP = {
'Fresh Produce': ['lettuce', 'tomato', 'carrot', 'onion', 'garlic', 'spinach', 'broccoli', 'courgette', 'pepper', 'mushroom', 'cucumber', 'avocado', 'lemon', 'lime', 'ginger', 'basil', 'coriander', 'parsley'],
'Meat & Fish': ['chicken', 'beef', 'pork', 'lamb', 'fish', 'salmon', 'tuna', 'cod', 'prawn', 'bacon', 'ham'],
'Dairy & Eggs': ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg', 'parmesan', 'paneer'],
'Tins & Jars': ['chickpea', 'lentil', 'bean', 'coconut milk', 'chopped tomato', 'tomato paste', 'pesto', 'tahini', 'peanut butter', 'stock', 'curry paste'],
'Dry Goods': ['pasta', 'spaghetti', 'rice', 'flour', 'oats', 'bread', 'quinoa', 'salt', 'pepper', 'cumin', 'paprika', 'turmeric', 'curry powder', 'oil', 'olive oil', 'vinegar', 'chia seeds', 'granola', 'flatbread', 'chilli'],
'Frozen': ['frozen']
};

function categ(item) {
var l = item.toLowerCase();
for (var s in SMAP) {
if (SMAP[s].some(function(k) { return l.indexOf(k) > -1; })) return s;
}
return 'Other';
}

function buildShop() {
var el = document.getElementById('shcontent');
if (!S.yearPlan || Object.keys(S.yearPlan).length === 0) {
el.innerHTML = '<div style="text-align:center;padding:4rem;color:var(--mu)"><p style="font-size:1.05rem;margin-bottom:1rem">Build a meal plan first!</p><button class="bp" onclick="show(\'plan\')">Build My Plan</button></div>';
return;
}
var seen = {}, list = {};
var weekKeys = Object.keys(S.yearPlan);
var currentWeekData = S.yearPlan[weekKeys[S.currentWeek]] || {};
Object.values(currentWeekData).forEach(function(day) {
if (day) {
  ['breakfast', 'lunch', 'dinner'].forEach(function(type) {
    var m = day[type];
    if (m && m.ing) {
      m.ing.forEach(function(ing) {
        var key = ing.toLowerCase().replace(/^[\d.\/\w]+\s*(g|ml|tsp|tbsp|tin|handful|pinch|litre|kg|oz|lb|cup|x)\s+/i, '').trim();
        if (!seen[key]) {
          seen[key] = true;
          var s = categ(ing);
          if (!list[s]) list[s] = [];
          list[s].push(ing);
        }
      });
    }
  });
}
});
var order = Object.keys(SMAP).concat(['Other']);
var weekName = weekKeys[S.currentWeek] || 'Current Week';
var html = '<p style="color:var(--mu);margin-bottom:1.5rem;font-size:.88rem">' + weekName + ' - ' + Object.keys(seen).length + ' items. Tick off as you go!</p>';
order.forEach(function(s) {
if (!list[s]) return;
html += '<div class="shs"><div class="shsh">' + s + '</div>';
list[s].forEach(function(item, i) {
html += '<div class="shi"><input type="checkbox" id="si' + i + '" onchange="strikeItem(this)"/><label for="si' + i + '" style="cursor:pointer;flex:1">' + item + '</label></div>';
});
html += '</div>';
});
el.innerHTML = html;
}

function strikeItem(cb) {
var l = cb.nextElementSibling;
l.style.textDecoration = cb.checked ? 'line-through' : 'none';
l.style.color = cb.checked ? 'var(--mu)' : 'var(--tx)';
}

function setStar(n) {
S.star = n;
document.querySelectorAll('.star').forEach(function(s, i) { s.classList.toggle('lit', i < n); });
document.getElementById('stlbl').textContent = SLBLS[n] || '';
}

async function submitFB() {
if (!S.star) {
toast('Please tap a star to rate first');
return;
}

var feedbackText = document.getElementById('fbc').value || '';
var lovedMeals = document.getElementById('fbl').value || '';
var rating = S.star;

// Save to backend
try {
    await apiCall('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({ rating, feedback_text: feedbackText, loved_meals: lovedMeals })
    });
} catch (err) {
    console.error('Failed to save feedback:', err);
}

// Hide form, show confirmation
document.getElementById('fbform').style.display = 'none';
document.getElementById('fbthanks').style.display = 'block';

// Show Researcher Agent popup
setTimeout(function() {
    showResearcherPopup(rating, feedbackText);
}, 500);
}

function showResearcherPopup(rating, feedbackText) {
var popup = document.getElementById('researcherPopup');
var text = document.getElementById('researcherText');

if (!popup || !text) return;

// Customize message based on rating
var messages = [
    "We're sorry to hear that. Thank you for your honest feedback — we'll work hard to improve! 💪",
    "Thanks for sharing! We hear you and we're committed to making things better. 🌱",
    "Thank you for your feedback! Every bit of input helps us grow. 🍽️",
    "That's wonderful to hear! We're thrilled you're enjoying YUMBOT. Keep it up! 🎉",
    "WOW! Thank you so much! We're absolutely delighted to hear you're loving YUMBOT! 🌟"
];

var ratingIndex = Math.min(Math.max(rating - 1, 0), 4);
text.textContent = messages[ratingIndex];

popup.style.display = 'flex';
}

function closeResearcherPopup() {
var popup = document.getElementById('researcherPopup');
if (popup) {
    popup.style.display = 'none';
}
}

function toast(msg) {
var t = document.querySelector('.toast');
if (!t) {
t = document.createElement('div');
t.className = 'toast';
document.body.appendChild(t);
}
t.textContent = msg;
t.classList.add('show');
clearTimeout(t._t);
t._t = setTimeout(function() { t.classList.remove('show'); }, 3500);
}

/* ═══ ADMIN FUNCTIONS ═══ */
function checkAdminPassword() {
    const password = document.getElementById('adminPassword').value;
    const errorEl = document.getElementById('adminError');
    
    if (password === ADMIN_PASSWORD) {
        isAdminMode = true;
        document.getElementById('adminLogin').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';
        loadAdminStats();
    } else {
        errorEl.style.display = 'block';
    }
}

function adminLogout() {
    isAdminMode = false;
    document.getElementById('adminLogin').style.display = 'block';
    document.getElementById('adminContent').style.display = 'none';
    document.getElementById('adminPassword').value = '';
}

async function loadAdminStats() {
    try {
        const data = await fetch(API_URL + '/api/admin/users', {
            headers: { 'x-admin-key': ADMIN_KEY }
        }).then(r => r.json());
        
        let users = data.users || [];
        let totalUsers = users.length;
        let activeUsers = users.filter(u => u.hasCompletedPreferences).length;
        let allUsers = users.map(u => ({
            email: u.email || 'N/A',
            name: u.display_name || 'Unknown',
            streak: u.streak_count || 0,
            meals: u.total_meals_planned || 0,
            date: u.created_at || 'Unknown'
        }));
        
        document.getElementById('statTotalUsers').textContent = totalUsers;
        document.getElementById('statActiveUsers').textContent = activeUsers;
        
        const tbody = document.getElementById('adminUserTable');
        tbody.innerHTML = '';
        
        allUsers.forEach(user => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid #eee';
            row.innerHTML = `
                <td style="padding:0.75rem">${user.email}</td>
                <td style="padding:0.75rem">${user.name}</td>
                <td style="padding:0.75rem">${user.streak}</td>
                <td style="padding:0.75rem">${user.meals}</td>
                <td style="padding:0.75rem">${user.date}</td>
            `;
            tbody.appendChild(row);
        });
        
        if (allUsers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding:2rem;text-align:center;color:#999">No users found</td></tr>';
        }
    } catch (err) {
        console.error('Failed to load admin stats:', err);
        document.getElementById('statTotalUsers').textContent = '0';
        document.getElementById('statActiveUsers').textContent = '0';
        document.getElementById('adminUserTable').innerHTML = '<tr><td colspan="5" style="padding:2rem;text-align:center;color:#999">Error loading users</td></tr>';
    }
}

// Show admin nav when logged in (for testing - remove in production)
function showAdminNav() {
    const navAdmin = document.getElementById('navAdmin');
    if (navAdmin) navAdmin.style.display = 'inline-block';
}

// Call this to enable admin panel in nav (or add to your profile menu)
function enableAdminMode() {
    showAdminNav();
}

// Initialize immediately if DOM already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

async function initApp() {
    // Initialize dark mode
    initDarkMode();
    
    // Always show landing page by default
    const landing = document.getElementById('page-landing');
    const mainHeader = document.getElementById('mainHeader');
    const mainContent = document.getElementById('mainContent');
    const mainFooter = document.getElementById('mainFooter');
    if (landing) landing.style.display = 'block';
    if (mainHeader) mainHeader.style.display = 'none';
    if (mainContent) mainContent.style.display = 'none';
    if (mainFooter) mainFooter.style.display = 'none';
    
    buildHomeGrid();
    buildDPBand();
    initYearSelector();
    
    // Check if user is already logged in
    const savedUserId = localStorage.getItem('yumbot_user_id');
    if (savedUserId) {
        try {
            const data = await apiCall('/api/profile');
            if (data.user) {
                currentUser = { id: data.user.id, email: data.user.email };
                userProfile = data.user;
                hasCompletedPreferences = data.user.hasCompletedPreferences || false;
                showMainApp();
            }
        } catch (err) {
            console.log('Could not restore session');
            localStorage.removeItem('yumbot_user_id');
        }
    }
}
