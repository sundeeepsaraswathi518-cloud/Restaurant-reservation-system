// Clear authentication saved by older builds. This build uses sessionStorage so users must log in again.
["restpro_token", "restpro_logged_in", "restpro_user_email", "restpro_role"].forEach((key) => {
  localStorage.removeItem(key);
});

const RESTPRO_API_URL = "http://localhost:5000/api";

// Convert MongoDB reservation records to the field names used by the existing UI.
function normalizeRestProReservation(record) {
  const b = record || {};
  const restaurantName = b.restaurantName || b.restaurant || "Restaurant";
  const restaurant = (typeof mockRestaurants !== "undefined" ? mockRestaurants : [])
    .find(r => String(r.name).toLowerCase() === String(restaurantName).toLowerCase());
  const tableNumber = b.tableNumber ?? b.table ?? "—";
  const table = restaurant && restaurant.tables
    ? restaurant.tables.find(t => String(t.number) === String(tableNumber))
    : null;
  const items = Array.isArray(b.preOrderItems) ? b.preOrderItems : [];
  const preOrderSummary = b.preOrderSummary || (items.length
    ? `${items.map(item => `${item.name} (x${item.quantity}) - ₹${Number(item.price || 0) * Number(item.quantity || 0)}`).join(", ")} [Total Food Cost: ₹${Number(b.preOrderTotal || 0)}]`
    : "None pre-ordered");

  return {
    ...b,
    id: b._id || b.id,
    restaurantId: b.restaurantId ?? (restaurant ? restaurant.id : ""),
    restaurant: restaurantName,
    location: b.location || (restaurant ? restaurant.location : ""),
    type: b.type || (restaurant ? restaurant.type : ""),
    date: b.reservationDate || b.date || "",
    time: b.reservationSlot || b.time || "",
    guests: Number(b.numberOfGuests ?? b.guests ?? 0),
    tableId: b.tableId || (table ? table.id : String(tableNumber)),
    tableNumber: String(tableNumber),
    tableCapacity: b.tableCapacity || (table ? table.capacity : ""),
    email: b.email || sessionStorage.getItem("restpro_user_email") || "",
    preOrderSummary,
    dietary: b.dietaryPreferences || b.dietary || "None",
    occasion: b.occasion || "None specified",
    special: b.specialRequest || b.specialRequests || b.special || "None specified",
    status: String(b.status || "confirmed").toLowerCase() === "cancelled" ? "Cancelled" : "Confirmed"
  };
}

async function syncRestProBookings() {
  const token = sessionStorage.getItem("restpro_token");
  if (!token) return;
  try {
    const response = await fetch(`${RESTPRO_API_URL}/reservations/my`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (response.status === 401 || response.status === 403) return;
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Unable to load bookings.");
    const bookings = (data.bookings || data.reservations || []).map(normalizeRestProReservation);
    localStorage.setItem("restpro_bookings", JSON.stringify(bookings));
    const page = document.body.dataset.page;
    if (page === "reservation" && typeof window.renderFloorPlan === "function") window.renderFloorPlan();
    if (page === "my-reservations" && typeof initMyReservationsPage === "function") initMyReservationsPage();
  } catch (error) {
    console.warn("RestPro booking sync failed:", error.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderNavbar();
  const page = document.body.dataset.page;

  if (page === "restaurants") {
    initRestaurantPage();
  } else if (page === "restaurant-menu") {
    initRestaurantMenuPage();
  } else if (page === "reservation") {
    initReservationPage();
  } else if (page === "favourites") {
    initFavouritesPage();
  } else if (page === "my-reservations") {
    initMyReservationsPage();
  } else if (page === "login" || page === "register" || page === "admin-login") {
    initAuthPages(page);
  } else if (page === "owner-application") {
    initOwnerApplicationPage();
  } else if (page === "owner-dashboard") {
    initOwnerDashboardPage();
  } else if (page === "admin-applications") {
    initAdminApplicationsPage();
  }
});

function renderNavbar() {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;

  const userEmail = sessionStorage.getItem("restpro_user_email") || "Customer";
  const isLoggedIn = sessionStorage.getItem("restpro_logged_in");
  const currentPage = document.body.dataset.page;

  navbar.innerHTML = `
    <div class="nav-container">
      <a href="index.html" class="logo">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>
        </svg>
        RestPro
      </a>
      <ul class="nav-links">
        <li><a href="index.html" class="${currentPage === 'home' ? 'active-link' : ''}">Home</a></li>
        <li><a href="restaurants.html" class="${currentPage === 'restaurants' || currentPage === 'restaurant-menu' ? 'active-link' : ''}">Restaurants</a></li>
        <li><a href="reservation.html" class="${currentPage === 'reservation' ? 'active-link' : ''}">Reserve & Pre-Order</a></li>
        <li><a href="favourites.html" class="${currentPage === 'favourites' ? 'active-link' : ''}">Favourites</a></li>
        <li><a href="my-reservations.html" class="${currentPage === 'my-reservations' ? 'active-link' : ''}">My Bookings</a></li>
        <li><a href="owner-application.html" class="${currentPage === 'owner-application' ? 'active-link' : ''}">Become a Partner</a></li>
        
        ${isLoggedIn ? `<li><span class="user-badge">👤 ${userEmail}</span></li><li><a href="#" onclick="logoutUser()" class="btn btn-sm btn-outline">Logout</a></li>` : `<li><a href="login.html" class="btn btn-sm ${currentPage === 'login' ? 'active-link' : ''}">Login</a></li>`}
      </ul>
    </div>
  `;
}

window.logoutUser = function() {
  sessionStorage.removeItem("restpro_logged_in");
  sessionStorage.removeItem("restpro_user_email");
  sessionStorage.removeItem("restpro_role");
  sessionStorage.removeItem("restpro_token");

  alert("Logged out successfully.");
  window.location.href = "index.html";
};

// Restaurants with configured tables & floor plans (Capacities: 2, 4, 6, 8, 10)
const mockRestaurants = [
  {
    id: 1,
    name: "Murugan Idli Shop",
    type: "Veg",
    cuisine: "South Indian",
    rating: 4.8,
    location: "47, East Mada Street, T. Nagar, Chennai, Tamil Nadu 600017",
    hours: "9:30 AM - 10:30 PM",
    mealRanges: "Morning (9:30 AM - 11:30 AM) | Afternoon (1:00 PM - 3:30 PM) | Night (7:00 PM - 10:30 PM)",
    tables: [
      { id: "T1", number: 1, capacity: 2, zone: "Window View" },
      { id: "T2", number: 2, capacity: 2, zone: "Window View" },
      { id: "T3", number: 3, capacity: 4, zone: "Main Dining" },
      { id: "T4", number: 4, capacity: 4, zone: "Main Dining" },
      { id: "T5", number: 5, capacity: 6, zone: "Family Hall" },
      { id: "T6", number: 6, capacity: 6, zone: "Family Hall" },
      { id: "T7", number: 7, capacity: 8, zone: "Large Party Section" },
      { id: "T8", number: 8, capacity: 10, zone: "VIP Banquet" }
    ],
    fullMenu: [
      { name: "Podi Ghee Thatte Idli", category: "Tiffin", price: 140, timing: "Morning & Night", image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80", desc: "Soft rice cakes tossed in aromatic gun powder and pure ghee." },
      { name: "Crispy Masala Dosa", category: "Tiffin", price: 160, timing: "Morning, Afternoon & Night", image: "https://tse1.mm.bing.net/th/id/OIP._xBHPzBUi_bBMaoliJGeBwHaE7?r=0&pid=Api&h=220&P=0", desc: "Golden thin crepe stuffed with spiced potato mash." },
      { name: "Mini Tiffin Combo", category: "Meals", price: 210, timing: "Morning & Afternoon", image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=400&q=80", desc: "Idli, mini dosa, pongal, and sweet kesari." },
      { name: "Saffron Filter Coffee", category: "Beverages", price: 60, timing: "All Day (7:00 AM - 11:30 PM)", image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80", desc: "Traditional South Indian decoction coffee with a hint of saffron." },
      { name: "Medhu Vada (2 pcs)", category: "Tiffin", price: 70, timing: "Morning & Night", image: "https://tse3.mm.bing.net/th/id/OIP.WMo_4F3fbkfLFB98aoxyUgHaHa?r=0&pid=Api&h=220&P=0", desc: "Crispy outside, fluffy inside lentil fritter." }
    ]
  },
  {
    id: 2,
    name: "Saravana Bhavan",
    type: "Veg",
    cuisine: "South Indian",
    rating: 4.6,
    location: "33, 1st Avenue, Velachery Main Road, Velachery, Chennai, Tamil Nadu 600042",
    hours: "9:30 AM - 11:00 PM",
    mealRanges: "Morning (9:30 AM - 11:30 AM) | Afternoon (1:00 PM - 3:30 PM) | Night (7:00 PM - 11:00 PM)",
    tables: [
      { id: "T1", number: 1, capacity: 2, zone: "Window View" },
      { id: "T2", number: 2, capacity: 2, zone: "Window View" },
      { id: "T3", number: 3, capacity: 4, zone: "Main Dining" },
      { id: "T4", number: 4, capacity: 4, zone: "Main Dining" },
      { id: "T5", number: 5, capacity: 6, zone: "Family Hall" },
      { id: "T6", number: 6, capacity: 6, zone: "Family Hall" },
      { id: "T7", number: 7, capacity: 8, zone: "Large Party Section" },
      { id: "T8", number: 8, capacity: 10, zone: "VIP Banquet" }
    ],
    fullMenu: [
      { name: "Ghee Roast Dosa", category: "Tiffin", price: 170, timing: "Morning, Afternoon & Night", image: "https://tse2.mm.bing.net/th/id/OIP.oq-Oi6AKJy5PHflg2bpDLQHaE8?r=0&pid=Api&h=220&P=0", desc: "Crispy long dosa roasted generously in pure ghee." },
      { name: "South Indian Meals", category: "Meals", price: 240, timing: "Afternoon Only (1:00 PM - 3:00 PM)", image: "https://tse3.mm.bing.net/th/id/OIP.54utjxfNRSgD9jhkEAbLOAHaE8?r=0&pid=Api&h=220&P=0", desc: "Rice, sambar, rasam, kootu, poriyal, appalam, and payasam." },
      { name: "Vada (2 Pcs)", category: "Tiffin", price: 80, timing: "Morning & Night", image: "https://tse1.mm.bing.net/th/id/OIP.nkYLzwly42Bwe1bkqhub-wHaHa?r=0&pid=Api&h=220&P=0", desc: "Crispy urad dal fritters served with coconut chutney and sambar." },
      { name: "Rose Milk", category: "Beverages", price: 70, timing: "All Day (7:00 AM - 11:30 PM)", image: "https://tse3.mm.bing.net/th/id/OIP.4S8MZYlQROHoErvLUC1iFgHaHa?r=0&pid=Api&h=220&P=0", desc: "Chilled sweet milk infused with rose syrup." },
      { name: "Poori Masala", category: "Tiffin", price: 130, timing: "Morning & Night", image: "https://tse1.mm.bing.net/th/id/OIP.oELXE65qnKkgJWiD0bXlGQHaF3?r=0&pid=Api&h=220&P=0", desc: "Fluffy fried wheat bread served with potato curry." }
    ]
  },
  {
    id: 3,
    name: "A2B (Adyar Ananda Bhavan)",
    type: "Veg",
    cuisine: "South Indian",
    rating: 4.5,
    location: "124, DB Road, RS Puram, Coimbatore, Tamil Nadu 641002",
    hours: "9:30 AM - 11:00 PM",
    mealRanges: "Morning (9:30 AM - 11:30 AM) | Afternoon (1:00 PM - 3:30 PM) | Night (7:00 PM - 11:00 PM)",
    tables: [
      { id: "T1", number: 1, capacity: 2, zone: "Window View" },
      { id: "T2", number: 2, capacity: 2, zone: "Window View" },
      { id: "T3", number: 3, capacity: 4, zone: "Main Dining" },
      { id: "T4", number: 4, capacity: 4, zone: "Main Dining" },
      { id: "T5", number: 5, capacity: 6, zone: "Family Hall" },
      { id: "T6", number: 6, capacity: 6, zone: "Family Hall" },
      { id: "T7", number: 7, capacity: 8, zone: "Large Party Section" },
      { id: "T8", number: 8, capacity: 10, zone: "VIP Banquet" }
    ],
    fullMenu: [
      { name: "Special Mysore Pak (250g)", category: "Sweets", price: 180, timing: "All Day (7:00 AM - 11:30 PM)", image: "https://tse3.mm.bing.net/th/id/OIP.JEAqOiJtHd6yTLTNTIWcggHaGA?r=0&pid=Api&h=220&P=0", desc: "Mouth-watering traditional ghee sweet." },
      { name: "Samosa Chaat", category: "Tiffin", price: 90, timing: "Afternoon & Night", image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80", desc: "Crushed samosa topped with curd, tamarind, and mint chutneys." },
      { name: "Badam Milk", category: "Beverages", price: 80, timing: "All Day (7:00 AM - 11:30 PM)", image: "https://tse1.mm.bing.net/th/id/OIP.Rtl01wGiHE9R00_nI-u-5wHaE7?r=0&pid=Api&h=220&P=0", desc: "Rich warm milk blended with crushed almonds and cardamom." },
      { name: "Pav Bhaji", category: "Tiffin", price: 140, timing: "Afternoon & Night", image: "https://tse3.mm.bing.net/th/id/OIP.9Hdu94fVlYHA8GquNwI1BgHaHq?r=0&pid=Api&h=220&P=0", desc: "Spiced vegetable mash served with buttered soft bread rolls." },
      { name: "Kaju Katli (100g)", category: "Sweets", price: 160, timing: "All Day (7:00 AM - 11:30 PM)", image: "https://tse2.mm.bing.net/th/id/OIP.fFQrqLBzL1_WGs6AXDT9OwHaHa?r=0&pid=Api&h=220&P=0", desc: "Premium cashew fudge diamond sweets." }
    ]
  },
  {
    id: 4,
    name: "Sangeetha Veg Restaurant",
    type: "Veg",
    cuisine: "South Indian",
    rating: 4.7,
    location: "7, 2nd Main Road, Gandhi Nagar, Adyar, Chennai, Tamil Nadu 600020",
    hours: "9:00 AM - 11:00 PM",
    mealRanges: "Morning (9:00 AM - 11:30 AM) | Afternoon (1:00 PM - 3:30 PM) | Night (7:00 PM - 11:00 PM)",
    tables: [
      { id: "T1", number: 1, capacity: 2, zone: "Window View" },
      { id: "T2", number: 2, capacity: 2, zone: "Window View" },
      { id: "T3", number: 3, capacity: 4, zone: "Main Dining" },
      { id: "T4", number: 4, capacity: 4, zone: "Main Dining" },
      { id: "T5", number: 5, capacity: 6, zone: "Family Hall" },
      { id: "T6", number: 6, capacity: 6, zone: "Family Hall" },
      { id: "T7", number: 7, capacity: 8, zone: "Large Party Section" },
      { id: "T8", number: 8, capacity: 10, zone: "VIP Banquet" }
    ],
    fullMenu: [
      { name: "North Indian Thali", category: "Meals", price: 280, timing: "Afternoon & Night", image: "https://tse4.mm.bing.net/th/id/OIP.evogtUFt0Kf2aRje3xHjNAHaHa?r=0&pid=Api&h=220&P=0", desc: "Roti, dal makhani, paneer gravy, jeera rice, and dessert." },
      { name: "Paneer Butter Masala", category: "Main Course", price: 220, timing: "Afternoon & Night", image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=400&q=80", desc: "Rich creamy tomato gravy with soft cottage cheese." },
      { name: "Veg Fried Rice", category: "Main Course", price: 200, timing: "Afternoon & Night", image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80", desc: "Wok-tossed rice with fresh vegetables and soy sauce." },
      { name: "Fresh Lime Soda", category: "Beverages", price: 60, timing: "All Day (7:00 AM - 11:30 PM)", image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=400&q=80", desc: "Refreshing sweet or salted lime drink." },
      { name: "Cream of Mushroom Soup", category: "Starters", price: 150, timing: "Afternoon & Night", image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=400&q=80", desc: "Warm creamy mushroom soup with herbs." }
    ]
  },
  {
    id: 5,
    name: "Amman Mess",
    type: "Non-Veg",
    cuisine: "South Indian, Multicuisine",
    rating: 4.9,
    location: "2/52, Alagappan Nagar, 3rd Street, Madurai, Tamil Nadu 625003",
    hours: "10:00 AM - 11:30 PM",
    mealRanges: "Morning (10:00 AM - 11:30 AM) | Afternoon (1:00 PM - 3:30 PM) | Night (7:00 PM - 11:30 PM)",
    tables: [
      { id: "T1", number: 1, capacity: 2, zone: "Window View" },
      { id: "T2", number: 2, capacity: 2, zone: "Window View" },
      { id: "T3", number: 3, capacity: 4, zone: "Main Dining" },
      { id: "T4", number: 4, capacity: 4, zone: "Main Dining" },
      { id: "T5", number: 5, capacity: 6, zone: "Family Hall" },
      { id: "T6", number: 6, capacity: 6, zone: "Family Hall" },
      { id: "T7", number: 7, capacity: 8, zone: "Large Party Section" },
      { id: "T8", number: 8, capacity: 10, zone: "VIP Banquet" }
    ],
    fullMenu: [
      { name: "Madurai Kari Dosa", category: "Specialties", price: 250, timing: "Morning, Afternoon & Night", image: "https://tse4.mm.bing.net/th/id/OIP.yZJTRoRzSYdaVcYVPsOG7wHaFZ?r=0&pid=Api&h=220&P=0", desc: "Multi-layered dosa topped with minced mutton and spiced egg." },
      { name: "Chettinad Chicken Curry", category: "Main Course", price: 320, timing: "Afternoon & Night", image: "https://tse2.mm.bing.net/th/id/OIP.HIsyzk061y6iweZXcrYXeAHaHa?r=0&pid=Api&h=220&P=0", desc: "Fiery pepper and freshly ground spices chicken gravy." },
      { name: "Madurai Jigarthanda", category: "Beverages", price: 120, timing: "All Day (7:00 AM - 11:30 PM)", image: "https://tse3.mm.bing.net/th/id/OIP.4cvf4RSMFgz_BhkxheaVhQHaFj?r=0&pid=Api&h=220&P=0", desc: "Iconic cooling dessert drink with almond gum and ice cream." },
      { name: "Mutton Chukka", category: "Starters", price: 360, timing: "Afternoon & Night", image: "https://tse4.mm.bing.net/th/id/OIP.ZbtU72sncIQ_YpZWc5a5LgHaEK?r=0&pid=Api&h=220&P=0", desc: "Tender mutton dry fry with small onions and black pepper." },
      { name: "Bone Soup (Aattukaal Soup)", category: "Starters", price: 140, timing: "Morning & Night", image: "https://tse2.mm.bing.net/th/id/OIP.9sFHOlysKWvLQRRadmkYKAHaEK?r=0&pid=Api&h=220&P=0", desc: "Warm spiced mutton bone broth." },
      { name: "Idiyappam with Mutton Salna", category: "Main Course", price: 200, timing: "Morning & Night", image: "https://tse2.mm.bing.net/th/id/OIP.RyzTc_XPqaJ_ZDrMv4ZXUQHaJQ?r=0&pid=Api&h=220&P=0", desc: "String hoppers served with spicy mutton gravy." }
    ]
  },
  {
    id: 6,
    name: "Dindigul Thalappakatti",
    type: "Non-Veg",
    cuisine: "Multicuisine",
    rating: 4.7,
    location: "92, TV Swamy Road West, RS Puram, Coimbatore, Tamil Nadu 641002",
    hours: "10:00 AM - 11:30 PM",
    mealRanges: "Morning (10:00 AM - 11:30 AM) | Afternoon (1:00 PM - 3:30 PM) | Night (7:00 PM - 11:30 PM)",
    tables: [
      { id: "T1", number: 1, capacity: 2, zone: "Window View" },
      { id: "T2", number: 2, capacity: 2, zone: "Window View" },
      { id: "T3", number: 3, capacity: 4, zone: "Main Dining" },
      { id: "T4", number: 4, capacity: 4, zone: "Main Dining" },
      { id: "T5", number: 5, capacity: 6, zone: "Family Hall" },
      { id: "T6", number: 6, capacity: 6, zone: "Family Hall" },
      { id: "T7", number: 7, capacity: 8, zone: "Large Party Section" },
      { id: "T8", number: 8, capacity: 10, zone: "VIP Banquet" }
    ],
    fullMenu: [
      { name: "Mutton Dindigul Biryani", category: "Meals", price: 380, timing: "Afternoon & Night", image: "https://tse2.mm.bing.net/th/id/OIP.0wM_OAJlfT0mBB7pShjIxwHaD4?r=0&pid=Api&h=220&P=0", desc: "Authentic seeraga samba rice cooked with tender mutton pieces." },
      { name: "Chicken Biryani", category: "Meals", price: 300, timing: "Afternoon & Night", image: "https://tse3.mm.bing.net/th/id/OIP.HasAJ9IofHVI2TsTolBbMAHaEK?r=0&pid=Api&h=220&P=0", desc: "Flavorful traditional bone-in chicken biryani." },
      { name: "Elaneer Payasam", category: "Dessert", price: 180, timing: "Afternoon & Night", image: "https://tse1.mm.bing.net/th/id/OIP.IyUXFtToqituKjtLeNO4IgHaJg?r=0&pid=Api&h=220&P=0", desc: "Tender coconut milk pudding." },
      { name: "Thalappakatti Chicken Fry", category: "Starters", price: 290, timing: "Afternoon & Night", image: "https://tse4.mm.bing.net/th/id/OIP.1nicYQr9x9V0k6hSCxv3swHaE8?r=0&pid=Api&h=220&P=0", desc: "Special spiced boneless chicken chunks." },
      { name: "Brain Fry", category: "Starters", price: 260, timing: "Afternoon & Night", image: "https://tse1.mm.bing.net/th/id/OIP.6zkk-yhuZYQt3hxjnzsoVgHaE7?r=0&pid=Api&h=220&P=0", desc: "Delicate mutton brain roasted with shallots and curry leaves." }
    ]
  },
  {
    id: 7,
    name: "Anjappar Chettinad Restaurant",
    type: "Non-Veg",
    cuisine: "Chettinad",
    rating: 4.7,
    location: "33, First Main Road, Gandhi Nagar, Adyar, Chennai, Tamil Nadu 600020",
    hours: "10:00 AM - 11:30 PM",
    mealRanges: "Morning (10:00 AM - 11:30 AM) | Afternoon (1:00 PM - 3:30 PM) | Night (7:00 PM - 11:30 PM)",
    tables: [
      { id: "T1", number: 1, capacity: 2, zone: "Window View" },
      { id: "T2", number: 2, capacity: 2, zone: "Window View" },
      { id: "T3", number: 3, capacity: 4, zone: "Main Dining" },
      { id: "T4", number: 4, capacity: 4, zone: "Main Dining" },
      { id: "T5", number: 5, capacity: 6, zone: "Family Hall" },
      { id: "T6", number: 6, capacity: 6, zone: "Family Hall" },
      { id: "T7", number: 7, capacity: 8, zone: "Large Party Section" },
      { id: "T8", number: 8, capacity: 10, zone: "VIP Banquet" }
    ],
    fullMenu: [
      { name: "Chettinad Mutton Chukka", category: "Starters", price: 350, timing: "Afternoon & Night", image: "https://tse4.mm.bing.net/th/id/OIP.ZbtU72sncIQ_YpZWc5a5LgHaEK?r=0&pid=Api&h=220&P=0", desc: "Dry roasted mutton tossed with shallots and black pepper." },
      { name: "Pepper Chicken Fry", category: "Starters", price: 280, timing: "Afternoon & Night", image: "https://tse4.mm.bing.net/th/id/OIP.Fmki79_7cGzbNRB4-y5whwHaLH?r=0&pid=Api&h=220&P=0", desc: "Juicy chicken chunks fried with crushed peppercorns." },
      { name: "Kothu Parotta (Chicken)", category: "Main Course", price: 240, timing: "Night Only (8:00 PM - 11:00 PM)", image: "https://tse1.mm.bing.net/th/id/OIP.S_bu5p66YBw8Yjgc5DgQHaE8?r=0&pid=Api&h=220&P=0", desc: "Shredded parotta scrambled with egg and chicken salna." },
      { name: "Prawn Masala", category: "Main Course", price: 340, timing: "Afternoon & Night", image: "https://tse1.mm.bing.net/th/id/OIP.63bhhilKtSGfYJpQ8-iNHQHaHa?r=0&pid=Api&h=220&P=0", desc: "Fresh prawns cooked in thick onion tomato gravy." },
      { name: "Vanjaram Fish Fry", category: "Starters", price: 390, timing: "Afternoon & Night", image: "https://tse1.mm.bing.net/th/id/OIP.BGkXDrCMnumOZqZMXgSq_AHaE8?r=0&pid=Api&h=220&P=0", desc: "Seer fish slice marinated in spicy Chettinad masala and shallow fried." },
      { name: "Crab Omelette", category: "Starters", price: 220, timing: "Night Only (8:00 PM - 11:00 PM)", image: "https://tse2.mm.bing.net/th/id/OIP.93xFCYD5MGtjvS2seUp9jAHaE8?r=0&pid=Api&h=220&P=0", desc: "Fluffy egg omelette loaded with fresh crab meat." }
    ]
  },
  {
    id: 8,
    name: "Junior Kuppanna",
    type: "Non-Veg",
    cuisine: "Multicuisine",
    rating: 4.8,
    location: "45, Perundurai Road, Near Collectorate, Salem Main Road, Erode, Tamil Nadu 638011",
    hours: "10:00 AM - 11:00 PM",
    mealRanges: "Morning (10:00 AM - 11:30 AM) | Afternoon (1:00 PM - 3:30 PM) | Night (7:00 PM - 11:00 PM)",
    tables: [
      { id: "T1", number: 1, capacity: 2, zone: "Window View" },
      { id: "T2", number: 2, capacity: 2, zone: "Window View" },
      { id: "T3", number: 3, capacity: 4, zone: "Main Dining" },
      { id: "T4", number: 4, capacity: 4, zone: "Main Dining" },
      { id: "T5", number: 5, capacity: 6, zone: "Family Hall" },
      { id: "T6", number: 6, capacity: 6, zone: "Family Hall" },
      { id: "T7", number: 7, capacity: 8, zone: "Large Party Section" },
      { id: "T8", number: 8, capacity: 10, zone: "VIP Banquet" }
    ],
    fullMenu: [
      { name: "Kongu Mutton Biryani", category: "Meals", price: 360, timing: "Afternoon & Night", image: "https://tse3.mm.bing.net/th/id/OIP.fwQMKTuIin02fP5TI08EeQHaE6?r=0&pid=Api&h=220&P=0", desc: "Traditional Kongunadu style aromatic rice dish." },
      { name: "Nattu Kozhi Fry", category: "Starters", price: 310, timing: "Afternoon & Night", image: "https://tse4.mm.bing.net/th/id/OIP.2jao1Vu8bdtBPKc7n9VhggHaEK?r=0&pid=Api&h=220&P=0", desc: "Country chicken shallow fried with country spices." },
      { name: "Pallipalayam Chicken", category: "Starters", price: 290, timing: "Afternoon & Night", image: "https://tse2.mm.bing.net/th/id/OIP.yUQIeI_v7pETcrmkj-S4BgHaHa?r=0&pid=Api&h=220&P=0", desc: "Dry chicken cooked with loads of sun-dried red chillies and garlic." },
      { name: "Kalaan Fry (Mushroom)", category: "Starters", price: 180, timing: "Afternoon & Night", image: "https://tse4.mm.bing.net/th/id/OIP.OKcOP0WRB2pjpiCheQClXAHaHa?r=0&pid=Api&h=220&P=0", desc: "Spiced crispy mushroom fry." },
      { name: "Mutton Kaima Balls", category: "Starters", price: 320, timing: "Afternoon & Night", image: "https://tse3.mm.bing.net/th/id/OIP.3LdXrwf4IsLResjrRaozjgHaHV?r=0&pid=Api&h=220&P=0", desc: "Minced mutton spherical meatballs deep fried to perfection." }
    ]
  }
];

function initRestaurantPage() {
  const container = document.getElementById("restaurantList");
  if (!container) return;

  function displayList(items) {
    container.innerHTML = items.map(r => `
      <div class="card">
        <div class="card-header-row">
          <h3 class="card-title">${r.name}</h3>
          <span class="badge-rating">★ ${r.rating}</span>
        </div>
        <div class="card-meta">
          <span>${r.cuisine}</span> • <span class="badge-type">${r.type}</span>
        </div>
        
        <div class="card-info-row">
          📍 <strong>Address:</strong> ${r.location}
        </div>
        <div class="card-info-row hours-row">
          🕒 Hours: ${r.hours}
        </div>
        <div class="card-meals">
          🍽️ ${r.mealRanges}
        </div>

        <div class="card-actions">
          <a href="restaurant-menu.html?id=${r.id}" class="btn btn-secondary btn-sm" style="flex:1; text-align:center;">View Full Menu</a>
          <button class="btn btn-sm btn-outline-primary" onclick="saveFavourite('${r.name}')">♥ Save</button>
        </div>
      </div>
    `).join('');
  }

  displayList(mockRestaurants);

  const searchInput = document.getElementById("restaurantSearch");
  const cuisineFilter = document.getElementById("cuisineFilter");
  const typeFilter = document.getElementById("typeFilter");

  function filterData() {
    let filtered = mockRestaurants;
    if (searchInput && searchInput.value) {
      const q = searchInput.value.toLowerCase();
      filtered = filtered.filter(r => r.name.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q));
    }
    if (cuisineFilter && cuisineFilter.value) {
      filtered = filtered.filter(r => r.cuisine.toLowerCase().includes(cuisineFilter.value.toLowerCase()));
    }
    if (typeFilter && typeFilter.value) {
      filtered = filtered.filter(r => r.type === typeFilter.value);
    }
    displayList(filtered);
  }

  if (searchInput) searchInput.addEventListener("input", filterData);
  if (cuisineFilter) cuisineFilter.addEventListener("change", filterData);
  if (typeFilter) typeFilter.addEventListener("change", filterData);
}

function initRestaurantMenuPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const restId = urlParams.get("id");
  const restaurant = mockRestaurants.find(r => r.id == restId) || mockRestaurants[0];

  const titleEl = document.getElementById("menuRestaurantName");
  const infoEl = document.getElementById("menuRestaurantInfo");
  const listEl = document.getElementById("fullMenuList");

  if (titleEl) titleEl.textContent = restaurant.name + " - Full Menu";
  if (infoEl) infoEl.innerHTML = `📍 <strong>Address:</strong> ${restaurant.location}<br>🕒 Open: ${restaurant.hours} | 🍽️ ${restaurant.mealRanges} | Rating: ★ ${restaurant.rating}`;

  if (listEl) {
    listEl.innerHTML = restaurant.fullMenu.map(item => `
      <div class="card">
        <img class="card-img" src="${item.image}" alt="${item.name}">
        <div class="card-body">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 class="card-title">${item.name}</h3>
            <span class="price-tag">₹${item.price}</span>
          </div>
          <div style="display:flex; gap:6px; margin:0.5rem 0; flex-wrap:wrap;">
            <span class="tag">${item.category}</span>
            <span class="tag tag-timing">🕒 ${item.timing}</span>
          </div>
          <p style="font-size:0.9rem; color:var(--text-muted); font-weight:600; margin-bottom:1.25rem; flex:1;">${item.desc}</p>
          <a href="reservation.html?rest=${restaurant.id}" class="btn btn-sm" style="text-align:center;">Reserve Table & Pre-Order</a>
        </div>
      </div>
    `).join('');
  }
}

window.saveFavourite = function(name) {
  let favs = JSON.parse(localStorage.getItem("restpro_favs")) || [];
  if (!favs.includes(name)) {
    favs.push(name);
    localStorage.setItem("restpro_favs", JSON.stringify(favs));
    alert(name + " added to your favourites!");
  } else {
    alert(name + " is already in your favourites.");
  }
};

function generateTimeSlots(restaurantId) {
  const rest = mockRestaurants.find(r => r.id == restaurantId) || mockRestaurants[0];
  let slots = [];
  let morningTimes = [];
  let lunchTimes = ["01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM"]; // Universal standard lunch slots always available
  let nightTimes = [];

  if (rest.name === "Murugan Idli Shop") {
    morningTimes = ["09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM"];
    nightTimes = ["07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM", "09:00 PM", "09:30 PM", "10:00 PM", "10:30 PM"];
  } else if (rest.name === "Saravana Bhavan" || rest.name === "A2B (Adyar Ananda Bhavan)") {
    morningTimes = ["09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM"];
    nightTimes = ["07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM", "09:00 PM", "09:30 PM", "10:00 PM", "10:30 PM", "11:00 PM"];
  } else if (rest.name === "Sangeetha Veg Restaurant") {
    morningTimes = ["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM"];
    nightTimes = ["07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM", "09:00 PM", "09:30 PM", "10:00 PM", "10:30 PM", "11:00 PM"];
  } else if (rest.name === "Junior Kuppanna") {
    morningTimes = ["10:00 AM", "10:30 AM", "11:00 AM"];
    nightTimes = ["07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM", "09:00 PM", "09:30 PM", "10:00 PM", "10:30 PM", "11:00 PM"];
  } else {
    // Amman Mess, Thalappakatti, Anjappar (10:00 AM - 11:30 PM)
    morningTimes = ["10:00 AM", "10:30 AM", "11:00 AM"];
    nightTimes = ["07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM", "09:00 PM", "09:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM"];
  }

  slots.push({ range: "Morning Sessions", times: morningTimes });
  slots.push({ range: "Afternoon Lunch", times: lunchTimes });
  slots.push({ range: "Night Sessions", times: nightTimes });

  return slots;
}

let selectedTableId = null;

function initReservationPage() {
  const isLoggedIn = sessionStorage.getItem("restpro_logged_in");
  const noticeBox = document.getElementById("loginNotice");
  const formBox = document.getElementById("reservationFormContainer");

  if (!isLoggedIn) {
    if (noticeBox) noticeBox.style.display = "block";
    if (formBox) formBox.style.display = "none";
    return;
  } else {
    if (noticeBox) noticeBox.style.display = "none";
    if (formBox) formBox.style.display = "block";
  }

  const urlParams = new URLSearchParams(window.location.search);
  const preSelectedRest = urlParams.get("rest") || null;

  const restSelect = document.getElementById("bookingRestaurant");
  if (restSelect) {
    restSelect.innerHTML = '<option value="">-- Choose Restaurant --</option>' + mockRestaurants.map(r => `<option value="${r.id}" ${r.id == preSelectedRest ? 'selected' : ''}>${r.name} (${r.location.split(',')[2] || r.location} - ${r.type})</option>`).join('');
    if (!preSelectedRest) {
      restSelect.value = "";
    }
  }

  function updatePreOrderMenu() {
    const curRestId = restSelect ? restSelect.value : preSelectedRest;
    const selectedRest = mockRestaurants.find(r => r.id == curRestId) || null;
    const preOrderContainer = document.getElementById("preOrderDishesContainer");
    if (preOrderContainer) {
      if (!selectedRest) {
        preOrderContainer.innerHTML = '<div style="padding:1.25rem; text-align:center; color:#64748b; font-weight:600; font-size:0.9rem;">Please search and select a restaurant above to view and pre-order respective menu dishes.</div>';
        return;
      }
      preOrderContainer.innerHTML = selectedRest.fullMenu.map((m, idx) => `
        <div class="preorder-item-row" style="display:flex; align-items:center; justify-content:space-between; gap:10px; background:#f8fafc; padding:10px 14px; border-radius:8px; border:1px solid #cbd5e1; margin-bottom:8px;">
          <div style="flex:1;">
            <strong style="font-size:0.95rem; color:#0f172a; font-weight:700;">${m.name}</strong>
            <div style="font-size:0.85rem; color:var(--primary-color); font-weight:800;">₹${m.price} each</div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" class="qty-btn" onclick="adjustQty(${idx}, -1)">-</button>
            <input type="number" id="dish_qty_${idx}" data-dishname="${m.name}" data-price="${m.price}" value="0" min="0" max="10" readonly style="width:40px; text-align:center; padding:4px; font-weight:800; border:1.5px solid #94a3b8; border-radius:4px; background:#fff; color:#0f172a;">
            <button type="button" class="qty-btn" onclick="adjustQty(${idx}, 1)">+</button>
          </div>
        </div>
      `).join('');
    }
  }

  window.adjustQty = function(idx, change) {
    const input = document.getElementById(`dish_qty_${idx}`);
    if (!input) return;
    let val = parseInt(input.value, 10) || 0;
    val = Math.max(0, Math.min(4, val + change));
    input.value = val;
    const dishName = input.dataset.dishname;
    if (dishName) {
      window.preOrderQuantities = window.preOrderQuantities || {};
      window.preOrderQuantities[dishName] = val;
    }
  };

  updatePreOrderMenu();
  if (restSelect) restSelect.addEventListener("change", () => {
    updatePreOrderMenu();
    renderFloorPlan();
    const timeSelect = document.getElementById("bookingTime");
    if (timeSelect) {
      const slotCategories = generateTimeSlots(restSelect.value);
      timeSelect.innerHTML = slotCategories.map(cat => `
        <optgroup label="${cat.range}">
          ${cat.times.map(t => `<option value="${t}">${t}</option>`).join('')}
        </optgroup>
      `).join('');
    }
  });

  if (typeof flatpickr !== "undefined") {
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    let maxBookingDate = new Date(today.getTime());
    maxBookingDate.setDate(today.getDate() + 20);

    flatpickr("#bookingDate", {
      dateFormat: "d/m/Y",
      defaultDate: today,
      minDate: "today",
      maxDate: maxBookingDate,
      onChange: function(selectedDates, dateStr) {
        if (selectedDates.length > 0) {
          let selDate = new Date(selectedDates[0]);
          selDate.setHours(0, 0, 0, 0);
          let diffTime = selDate - today;
          let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 20) {
            showDateLimitModal();
          }
        }
        renderFloorPlan();
      }
    });
  }

  window.showDateLimitModal = function() {
    let modalId = "dateLimitModalOverlay";
    let existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = modalId;
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.75); z-index:9999; display:flex; justify-content:center; align-items:center; padding:1rem; backdrop-filter:blur(5px);";

    overlay.innerHTML = `
      <div style="background:#0f172a; color:#fff; width:100%; max-width:480px; border-radius:16px; padding:2rem; border:2px solid #334155; box-shadow:0 25px 50px rgba(0,0,0,0.5); text-align:center;">
        <div style="font-size:3rem; margin-bottom:0.75rem;">📅</div>
        <h3 style="margin:0 0 0.5rem 0; color:#f8fafc; font-size:1.35rem;">Booking Advance Limit Exceeded</h3>
        <p style="color:#cbd5e1; font-size:0.95rem; margin-bottom:1.5rem; line-height:1.5;">
          RestPro allows table reservations up to a maximum of exactly <strong>20 days in advance</strong>. Please select a date within the allowed 20-day window.
        </p>
        <button type="button" onclick="document.getElementById('${modalId}').remove()" class="btn" style="width:100%; background:#f59e0b; color:#000; font-weight:800; padding:12px; border-radius:8px; border:none; cursor:pointer; font-size:1rem;">Got It</button>
      </div>
    `;

    document.body.appendChild(overlay);
  };

  const timeSelect = document.getElementById("bookingTime");
  if (timeSelect) {
    const curRestId = restSelect ? restSelect.value : 1;
    const slotCategories = generateTimeSlots(curRestId);
    timeSelect.innerHTML = slotCategories.map(cat => `
      <optgroup label="${cat.range}">
        ${cat.times.map(t => `<option value="${t}">${t}</option>`).join('')}
      </optgroup>
    `).join('');
  }

  if (timeSelect) timeSelect.addEventListener("change", renderFloorPlan);

  const guestSelect = document.getElementById("guestCount");
  if (guestSelect) {
    guestSelect.addEventListener("change", () => {
      const guests = parseInt(guestSelect.value);
      if (guests > 10) {
        alert("For group reservations above 10 guests, please contact the restaurant.");
        guestSelect.value = "10";
      }
      renderFloorPlan();
    });
  }

  // Initial render of floor plan
  renderFloorPlan();

  const form = document.getElementById("reservationForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
            const dateValStr = document.getElementById("bookingDate").value;
      const parts = dateValStr.split("/");
      if (parts.length === 3) {
        const selectedDateObj = new Date(parts[2], parts[1] - 1, parts[0]);
        const todayObj = new Date();
        todayObj.setHours(0,0,0,0);
        const diffTime = selectedDateObj - todayObj;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 20) {
          showDateLimitModal();
          return;
        }
      }
      e.preventDefault();
      const restaurantSearch = document.getElementById("liveRestaurantSearchInput");
      const dateField = document.getElementById("bookingDate");
      const timeField = document.getElementById("bookingTime");
      const guestField = document.getElementById("guestCount");
      if (!restSelect || !restSelect.value || !mockRestaurants.some(r => r.id == restSelect.value) || !restaurantSearch || restaurantSearch.value.trim().toLowerCase() !== (mockRestaurants.find(r => r.id == restSelect.value)?.name || "").toLowerCase()) {
        alert("Please search for and select a restaurant before confirming your booking.");
        if (restaurantSearch) restaurantSearch.focus();
        return;
      }
      if (!dateField || !dateField.value.trim()) {
        alert("Please select a reservation date.");
        if (dateField) dateField.focus();
        return;
      }
      if (!timeField || !timeField.value) {
        alert("Please select a reservation slot.");
        if (timeField) timeField.focus();
        return;
      }
      if (!guestField || !guestField.value) {
        alert("Please select the number of guests.");
        if (guestField) guestField.focus();
        return;
      }
      if (!selectedTableId) {
        alert("Please select an available table before confirming your booking.");
        document.getElementById("floorPlanVisualContainer")?.scrollIntoView({behavior:"smooth", block:"center"});
        return;
      }
      const restId = restSelect.value;
      const selectedRest = mockRestaurants.find(r => r.id == restId);
      const dateDisplay = document.getElementById("bookingDate").value;
      const time = document.getElementById("bookingTime").value;
      const guests = parseInt(guestField.value, 10);

      if (guests > 10) {
        alert("For group reservations above 10 guests, please contact the restaurant.");
        return;
      }

      if (!selectedTableId) {
        alert("Please select an available table from the visual floor plan.");
        return;
      }

      const tableObj = selectedRest.tables.find(t => t.id === selectedTableId);
      if (!tableObj || tableObj.capacity < guests) {
        alert("Please select an available table that can accommodate all guests.");
        renderFloorPlan();
        return;
      }


      const dietary = document.getElementById("dietaryPrefs")?.value || "None specified";
      const occasion = document.getElementById("occasion")?.value || "";
      const special = document.getElementById("specialRequests")?.value.trim() || "";
      const userEmail = sessionStorage.getItem("restpro_user_email") || "customer@example.com";

      
      let orderedItems = [];
      let totalPreOrderCost = 0;

      const quantities = window.preOrderQuantities || {};

      Object.entries(quantities).forEach(([dishName, qtyValue]) => {
        const qty = parseInt(qtyValue, 10) || 0;

        if (qty > 0) {
          const dish = selectedRest.fullMenu.find(
            item => item.name === dishName
          );

          if (dish) {
            orderedItems.push(
              `${dish.name} (x${qty}) - ₹${dish.price * qty}`
            );
            totalPreOrderCost += dish.price * qty;
          }
        }
      });


      const preOrderSummary = orderedItems.length > 0 ? `${orderedItems.join(', ')} [Total Food Cost: ₹${totalPreOrderCost}]` : "None pre-ordered";

      // Double-check availability for table
      let bookings = JSON.parse(localStorage.getItem("restpro_bookings")) || [];
      const conflict = bookings.find(b => String(b.restaurantId) === String(restId) && (b.date || b.reservationDate) === dateDisplay && (b.time || b.reservationSlot) === time && String(b.tableId || b.tableNumber) === String(selectedTableId) && String(b.status).toLowerCase() !== "cancelled");

      if (conflict) {
        alert("❌ Sorry! This table has just been reserved for this time slot. Please choose another table.");
        renderFloorPlan();
        return;
      }

      let reminderRule = "1 Single Reminder scheduled (Dispatched 2 days after booking for advanced reservation)";

      // Send the field names expected by the Express reservation controller.
      const preOrderItems = Object.entries(quantities)
        .map(([dishName, qtyValue]) => {
          const quantity = parseInt(qtyValue, 10) || 0;
          const dish = selectedRest.fullMenu.find(item => item.name === dishName);
          return dish && quantity > 0
            ? { name: dish.name, quantity, price: Number(dish.price) }
            : null;
        })
        .filter(Boolean);

      const newBooking = {
        restaurantName: selectedRest.name,
        numberOfGuests: guests,
        reservationDate: dateDisplay,
        reservationSlot: time,
        tableNumber: String(tableObj.number),
        preOrderItems,
        dietaryPreferences: dietary,
        occasion,
        specialRequest: special
      };
      try {
        const token = sessionStorage.getItem("restpro_token");
        if (!token) {
          alert("Your login session is missing. Please log in again before booking.");
          window.location.href = "login.html";
          return;
        }
        const apiResponse = await fetch(`${RESTPRO_API_URL}/reservations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(newBooking)
        });
        const apiData = await apiResponse.json();
        if (!apiResponse.ok) {
          throw new Error(apiData.message || "Could not save your reservation.");
        }
        const apiReservation = apiData.booking || apiData.reservation || apiData;
        // Add UI-only details for the current browser session; the backend schema stores core booking fields.
        const savedBooking = normalizeRestProReservation({
          ...apiReservation,
          restaurantName: apiReservation.restaurantName || selectedRest.name,
          numberOfGuests: apiReservation.numberOfGuests || guests,
          reservationDate: apiReservation.reservationDate || dateDisplay,
          reservationSlot: apiReservation.reservationSlot || time,
          tableNumber: apiReservation.tableNumber || String(tableObj.number),
          preOrderItems: apiReservation.preOrderItems || preOrderItems,
          preOrderTotal: apiReservation.preOrderTotal ?? totalPreOrderCost,
          dietaryPreferences: apiReservation.dietaryPreferences || dietary,
          occasion: apiReservation.occasion || occasion,
          specialRequest: apiReservation.specialRequest || special,
          restaurantId: restId,
          location: selectedRest.location,
          type: selectedRest.type,
          tableId: tableObj.id,
          tableCapacity: tableObj.capacity,
          dietary,
          special,
          email: userEmail,
          preOrderSummary,
          status: apiReservation.status || "confirmed"
        });
        bookings = bookings.filter(b => String(b.id || b._id) !== String(savedBooking.id || savedBooking._id));
        bookings.unshift(savedBooking);
        localStorage.setItem("restpro_bookings", JSON.stringify(bookings));
        window.preOrderQuantities = {};
        selectedTableId = null;
        simulateRealEmailDispatch(userEmail, savedBooking);
        const msg = document.getElementById("bookingMessage");
        if (msg) {
          msg.textContent = `Reservation confirmed for Table #${tableObj.number}. Your booking was saved to RestPro.`;
          msg.style.color = "#16a34a";
        }
        renderFloorPlan();
      } catch (error) {
        console.error("Reservation save failed:", error);
        alert(error.message || "Could not save your reservation. Please check the backend and try again.");
      }
    });
  }
}

function renderFloorPlan() {
  const restSelect = document.getElementById("bookingRestaurant");
  const dateInput = document.getElementById("bookingDate");
  const timeSelect = document.getElementById("bookingTime");
  const guestSelect = document.getElementById("guestCount");

  const floorContainer = document.getElementById("floorPlanVisualContainer");
  if (!floorContainer) return;

  const restId = restSelect ? restSelect.value : 1;
  const dateStr = dateInput ? dateInput.value : "";
  const timeStr = timeSelect ? timeSelect.value : "08:00 AM";
  const guestCount = guestSelect ? parseInt(guestSelect.value) || 2 : 2;

  const selectedRest = mockRestaurants.find(r => r.id == restId) || mockRestaurants[0];
  const bookings = JSON.parse(localStorage.getItem("restpro_bookings")) || [];

  // Find booked table IDs for this restaurant, date, time
  const bookedTableIds = bookings
    .filter(b => b.restaurantId == restId && b.date == dateStr && b.time == timeStr && b.status === "Confirmed")
    .map(b => b.tableId);

  // Automatic Table Assignment & Recommendation Logic:
  // Rules: 1-2: 2-seater, 3-4: 4-seater, 5-6: 6-seater, 7-8: 8-seater, 9-10: 10-seater.
  // Find available tables with capacity >= guestCount
  let suitableTables = selectedRest.tables.filter(t => t.capacity >= guestCount && !bookedTableIds.includes(t.id));

  // Sort suitable tables by capacity ascending (smallest suitable first)
  suitableTables.sort((a, b) => a.capacity - b.capacity);

  let recommendedTableId = null;
  if (suitableTables.length > 0) {
    recommendedTableId = suitableTables[0].id;
  }

  // If user hasn't selected a table yet or current selected table is invalid/booked/too small, auto-select recommended
  if (!selectedTableId || bookedTableIds.includes(selectedTableId) || selectedRest.tables.find(t => t.id === selectedTableId)?.capacity < guestCount) {
    selectedTableId = recommendedTableId;
  }

  floorContainer.innerHTML = `
    <div class="floor-plan-container">
      <div class="floor-plan-header">
        <div>
          <h4 style="margin:0; font-size:1.1rem; color:#fff;">📍 Visual Restaurant Floor Plan</h4>
          <p style="margin:0.2rem 0 0 0; font-size:0.8rem; color:#94a3b8;">Interactive seating layout for ${selectedRest.name}</p>
        </div>
        <div class="floor-legend">
          <div class="legend-item"><span class="legend-dot" style="background:#16a34a;"></span> Available</div>
          <div class="legend-item"><span class="legend-dot" style="background:#dc2626;"></span> Reserved</div>
          <div class="legend-item"><span class="legend-dot" style="background:#f59e0b;"></span> Selected</div>
          <div class="legend-item"><span class="legend-dot" style="background:#475569;"></span> Too Small</div>
        </div>
      </div>

      <div style="background:#0f172a; padding:8px 12px; border-radius:8px; margin-bottom:12px; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center;">
        <span>💡 <strong>Auto-Assigned Recommendation:</strong> ${recommendedTableId ? 'Table #' + selectedRest.tables.find(t => t.id === recommendedTableId).number + ' (' + selectedRest.tables.find(t => t.id === recommendedTableId).capacity + '-seater)' : 'No table available for this slot'}</span>
        <span style="font-size:0.75rem; color:#f59e0b;">(Click any available table to change)</span>
      </div>

      <div class="restaurant-map-area">
        <div class="map-zone-label">🚪 Main Entrance & Reception Desk</div>
        <div class="layout-grid">
          ${selectedRest.tables.map(t => {
            const isBooked = bookedTableIds.includes(t.id);
            const isTooSmall = t.capacity < guestCount;
            const isSelected = t.id === selectedTableId;

            let statusClass = "available";
            let statusText = "Available";

            if (isBooked) {
              statusClass = "reserved";
              statusText = "Reserved";
            } else if (isTooSmall) {
              statusClass = "unavailable";
              statusText = "Too Small";
            } else if (isSelected) {
              statusClass = "selected";
              statusText = "Selected";
            }

            return `
              <div class="table-node ${statusClass}" onclick="handleTableClick('${t.id}', ${isBooked}, ${isTooSmall})">
                <div class="table-number">Table ${t.number}</div>
                <div class="table-capacity">${t.capacity}-Seater</div>
                <div style="font-size:0.65rem; margin-top:4px; font-weight:700; text-transform:uppercase;">${statusText}</div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="map-zone-label" style="margin-top:1rem;">🍳 Kitchen & Service Counter Area</div>
      </div>
    </div>
  `;
}

let clickedReservedTableId = null;

window.handleTableClick = function(tableId) {
  const restSelect = document.getElementById("bookingRestaurant");
  const restId = restSelect ? restSelect.value : "1";
  const selectedRest = mockRestaurants.find(r => r.id == restId) || mockRestaurants[0];
  if (!selectedRest || !selectedRest.tables) return;

  const tableObj = selectedRest.tables.find(t => t.id === tableId);
  if (!tableObj) return;

  clickedReservedTableId = tableId;
  if (typeof window.renderFloorPlan === 'function') {
    window.renderFloorPlan();
  }
};

function simulateRealEmailDispatch(email, b) {
  let modalId = "realEmailModalOverlay";
  let existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = modalId;
  overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999; display:flex; justify-content:center; align-items:center; padding:1rem;";

  overlay.innerHTML = `
    <div style="background:#fff; width:100%; max-width:600px; border-radius:16px; padding:2rem; box-shadow:0 15px 40px rgba(0,0,0,0.3);">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:0.75rem; margin-bottom:1rem;">
        <h3 style="color:#16a34a; margin:0; display:flex; align-items:center; gap:8px;">🎉 Reservation Confirmed</h3>
        <button onclick="document.getElementById('${modalId}').remove()" style="background:none; border:none; font-size:1.4rem; cursor:pointer; font-weight:bold;">&times;</button>
      </div>
      <p style="font-size:0.85rem; color:#475569; margin-bottom:1rem;">Reservation account: <strong>${email}</strong> | Email delivery is not configured yet.</p>
      <div style="background:#f8f9fa; border:1px solid #cbd5e1; border-radius:8px; padding:1.25rem; font-size:0.95rem; line-height:1.6; color:#0f172a;">
        <p><strong>Dear Account Holder,</strong></p>
        <p>Your table reservation at <strong>${b.restaurant}</strong> has been saved in RestPro. This is an on-screen confirmation; no email has been sent.</p>
        <p style="margin:0.5rem 0;">📍 <strong>Full Address:</strong> ${b.location}</p>
        <ul style="margin:0.5rem 0 0.75rem 1.25rem;">
          <li><strong>Date (DD/MM/YYYY):</strong> ${b.date}</li>
          <li><strong>Time Slot:</strong> ${b.time}</li>
          <li><strong>Guests:</strong> ${b.guests} guest(s)</li>
          <li><strong>Assigned Table:</strong> Table #${b.tableNumber} (${b.tableCapacity}-seater)</li>
          <li><strong>Pre-Ordered Dishes & Quantities:</strong> ${b.preOrderSummary}</li>
          <li><strong>Dietary Preferences:</strong> ${b.dietary}</li>
          <li><strong>Special Requests:</strong> ${b.special}</li>
        </ul>
        
      </div>
      <button onclick="document.getElementById('${modalId}').remove(); window.location.href='my-reservations.html';" class="btn" style="width:100%; margin-top:1.25rem; text-align:center;">View Bookings</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function initFavouritesPage() {
  const list = document.getElementById("favouritesList");
  if (!list) return;
  
  let favs = JSON.parse(localStorage.getItem("restpro_favs")) || [];
  
  if (favs.length === 0) {
    list.innerHTML = "<p style='color:#f1f5f9; font-weight:600; text-shadow:0 1px 3px rgba(0,0,0,0.6);'>No favourite restaurants saved yet. Click 'Save' on any restaurant card to add it here.</p>";
    return;
  }

  list.innerHTML = favs.map((name, index) => `
    <div class="card" style="padding:1.5rem;">
      <h3 class="card-title">${name}</h3>
      <p style="color:var(--text-muted); font-weight:600; margin:0.5rem 0;">Tamil Nadu Dining Partner</p>
      <div style="display:flex; gap:10px; margin-top:10px;">
        <a href="restaurants.html" class="btn btn-sm" style="flex:1; text-align:center;">View Restaurants</a>
        <button class="btn btn-sm btn-secondary" onclick="removeFavourite(${index})">Remove</button>
      </div>
    </div>
  `).join('');
}

window.removeFavourite = function(index) {
  let favs = JSON.parse(localStorage.getItem("restpro_favs")) || [];
  favs.splice(index, 1);
  localStorage.setItem("restpro_favs", JSON.stringify(favs));
  initFavouritesPage();
};

function initMyReservationsPage() {
  const list = document.getElementById("reservationList");
  if (!list) return;

  const isLoggedIn = sessionStorage.getItem("restpro_logged_in");
  const recSectionHeading = document.getElementById("recommendationHeading");
  const recList = document.getElementById("recommendationList");

  let bookings = JSON.parse(localStorage.getItem("restpro_bookings")) || [];

  if (!isLoggedIn) {
    list.innerHTML = "<p style='color:#f1f5f9; font-weight:600; text-shadow:0 1px 3px rgba(0,0,0,0.6);'>Please log in to view your bookings and reservations.</p>";
    if (recSectionHeading) recSectionHeading.style.display = "none";
    if (recList) recList.style.display = "none";
    return;
  }

  if (recSectionHeading) recSectionHeading.style.display = "block";
  if (recList) recList.style.display = "block";

  if (bookings.length === 0) {
    list.innerHTML = "<p style='color:#f1f5f9; font-weight:600; text-shadow:0 1px 3px rgba(0,0,0,0.6);'>No active or past bookings found. Book a table to see your reservations listed here.</p>";
  } else {
    list.innerHTML = bookings.map((b, idx) => `
      <div class="card" style="padding:1.75rem; margin-bottom:1.25rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="margin:0; font-size:1.25rem; color:var(--text-main); font-weight:800;">${b.restaurant} (${b.type})</h3>
          <span class="badge-confirmed">${b.status}</span>
        </div>
        <p style="color:var(--text-muted); font-weight:600; margin:0.5rem 0; font-size:0.95rem;">📍 <strong>Full Address:</strong> ${b.location}</p>
        <p style="color:var(--text-muted); font-weight:600; margin:0.4rem 0; font-size:0.95rem;">📅 Date: ${b.date} | ⏰ Time: ${b.time} | 👥 Guests: ${b.guests} | 🪑 Table: #${b.tableNumber} (${b.tableCapacity}-seater)</p>
        <p style="color:var(--text-muted); font-weight:600; margin:0.4rem 0; font-size:0.95rem;">✉️ <strong>Registered Email:</strong> ${b.email || 'customer@example.com'}</p>
        <p style="font-size:0.95rem; font-weight:700; margin:0.4rem 0; color:#16a34a;">🍲 <strong>Pre-Ordered Dishes & Quantities:</strong> ${b.preOrderSummary || 'None'}</p>
        <p style="font-size:0.9rem; font-weight:600; margin:0.3rem 0; color:#334155;">🥗 <strong>Dietary Preferences:</strong> ${b.dietary || 'None'}</p>
        <p style="font-size:0.9rem; font-weight:600; margin:0.3rem 0; color:#334155;">🎉 <strong>Occasion:</strong> ${b.occasion || 'None specified'}</p>
        <p style="font-size:0.9rem; font-weight:600; margin:0.3rem 0; color:#334155;">📝 <strong>Special Requests:</strong> ${b.special || 'None specified'}</p>
        
        <div style="margin:0.85rem 0; background:#fef3c7; border:1.5px solid #f59e0b; padding:0.75rem 1rem; border-radius:6px; font-size:0.9rem; color:#92400e; font-weight:700;">
          
        </div>

        ${String(b.status).toLowerCase() !== "cancelled" ? `<button class="btn btn-sm btn-secondary" onclick="cancelBooking(${idx})">Cancel Booking</button>` : "<span class=\"badge-confirmed\">Cancelled</span>"}
      </div>
    `).join('');
  }

  window.cancelBooking = async function(idx) {
    const bookings = JSON.parse(localStorage.getItem("restpro_bookings")) || [];
    const booking = bookings[idx];
    if (!booking) return;
    if (!confirm("Cancel this reservation?")) return;
    try {
      if (booking._id || booking.id) {
        const token = sessionStorage.getItem("restpro_token");
        const response = await fetch(`${RESTPRO_API_URL}/reservations/${booking._id || booking.id}/cancel`, {
          method: "PATCH",
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not cancel booking.");
      }
      await syncRestProBookings();
      initMyReservationsPage();
    } catch (error) {
      alert(error.message || "Could not cancel booking. Please try again.");
    }
  };

  if (recList) {
    if (bookings.length > 0) {
      // Get the latest booked restaurant
      const lastBooking = bookings[0];
      const bookedRest = mockRestaurants.find(r => r.name.toLowerCase() === lastBooking.restaurant.toLowerCase()) || mockRestaurants[0];
      
      const recommendedRests = findMappedRestaurants(bookedRest.name).slice(0, 1);

      recList.innerHTML = recommendedRests.length ? recommendedRests.map(recommendedRest => `
        <div class="card" style="padding:1.5rem; background:linear-gradient(135deg, #fefce8 0%, #fef9c3 100%); border:1.5px solid #f59e0b;">
          <h3 style="color:#b45309; font-weight:800; margin-bottom:0.4rem;">★ Tailored Recommendation Based on Your Booking</h3>
          <p style="margin:0.5rem 0; font-weight:800; color:#0f172a;">Since you booked ${bookedRest.name}, you might also love ${recommendedRest.name}!</p>
          <p style="font-size:0.9rem; color:#334155; font-weight:600;">${recommendedRest.name} (${recommendedRest.cuisine}) — ★ ${recommendedRest.rating} rating.</p>
          <a href="restaurant-menu.html?id=${recommendedRest.id}" class="btn btn-sm" style="margin-top:12px; display:inline-block; background:#f59e0b; color:#000; font-weight:800;">View ${recommendedRest.name} Menu</a>
        </div>
      `).join('') : `<p>No mapped recommendations are available for ${bookedRest.name}.</p>`;
    } else {
      recList.innerHTML = `<p style="color:#f1f5f9; font-weight:600; text-shadow:0 1px 3px rgba(0,0,0,0.6);">Make a booking to see personalized restaurant recommendations here.</p>`;
    }
  }
}

function initAuthPages(page) {
  const API_URL = "http://localhost:5000/api/auth";

  if (page === "login" || page === "admin-login") {
    const form = document.getElementById("loginForm");

    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;
      const message = document.getElementById("loginMessage");
      const button = form.querySelector('button[type="submit"]');

      message.textContent = "Logging in...";
      message.style.color = "#64748b";
      button.disabled = true;

      try {
        const response = await fetch(`${API_URL}/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Login failed.");
        }

        const role = data.user.role || "customer";
        if (page === "admin-login" && role !== "admin") {
          throw new Error("This login page is for administrators only.");
        }

        sessionStorage.setItem("restpro_token", data.token);
        sessionStorage.setItem("restpro_logged_in", "true");
        sessionStorage.setItem("restpro_user_email", data.user.email);
        sessionStorage.setItem("restpro_role", role);

        message.textContent = "Login successful! Redirecting...";
        message.style.color = "#16a34a";

        setTimeout(() => {
          // The normal login page is the customer login: always open reservations.
          // Only the dedicated admin login redirects to the admin dashboard.
          if (page === "admin-login") {
            window.location.href = "admin-applications.html";
          } else {
            window.location.href = "reservation.html";
          }
        }, 700);
      } catch (error) {
        message.textContent =
          error.message === "Failed to fetch"
            ? "Cannot connect to the server. Please check that RestPro's backend is running."
            : error.message;

        message.style.color = "#dc2626";
      } finally {
        button.disabled = false;
      }
    });
  }

  if (page === "register") {
    const form = document.getElementById("registerForm");

    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("registerEmail").value.trim();
      const passwordInput = form.querySelector('input[type="password"]');
      const nameInput = form.querySelector(
        'input[name="name"], #registerName'
      );
      const message = document.getElementById("registerMessage");
      const button = form.querySelector('button[type="submit"]');

      if (!nameInput || !passwordInput) {
        message.textContent =
          "Registration form needs name and password fields.";
        message.style.color = "#dc2626";
        return;
      }

      message.textContent = "Creating your account...";
      message.style.color = "#64748b";
      button.disabled = true;

      try {
        const response = await fetch(`${API_URL}/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
  name: nameInput.value.trim(),
  email,
  password: passwordInput.value,
  role: "customer"
})
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Registration failed.");
        }

        message.textContent =
          "Account created successfully! Please log in.";
        message.style.color = "#16a34a";

        setTimeout(() => {
          window.location.href = "login.html";
        }, 1200);
      } catch (error) {
        message.textContent =
          error.message === "Failed to fetch"
            ? "Cannot connect to the server. Please check that RestPro's backend is running."
            : error.message;

        message.style.color = "#dc2626";
      } finally {
        button.disabled = false;
      }
    });
  }
}


// Simple owner application form connected to the existing backend API.
function initOwnerApplicationPage() {
  const form = document.getElementById("ownerApplicationForm");
  const message = document.getElementById("ownerApplicationMessage");
  const token = sessionStorage.getItem("restpro_token");
  if (!form || !message) return;
  if (!token) {
    message.innerHTML = 'Please <a href="login.html">log in</a> before applying.';
    return;
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const payload = {
      restaurantName: document.getElementById("ownerRestaurantName").value.trim(),
      address: document.getElementById("ownerAddress").value.trim(),
      phone: document.getElementById("ownerPhone").value.trim(),
      cuisineType: document.getElementById("ownerCuisine").value.trim(),
      description: document.getElementById("ownerDescription").value.trim()
    };
    button.disabled = true;
    message.textContent = "Submitting your application...";
    message.style.color = "#64748b";
    try {
      const response = await fetch(`${RESTPRO_API_URL}/owner-applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not submit application.");
      message.textContent = data.message || "Application submitted! You can check its status on the owner dashboard.";
      message.style.color = "#16a34a";
      form.reset();
    } catch (error) {
      message.textContent = error.message === "Failed to fetch" ? "Cannot reach RestPro backend. Make sure the backend is running." : error.message;
      message.style.color = "#dc2626";
    } finally { button.disabled = false; }
  });
}

function requireRole(role, messageElement) {
  const currentRole = sessionStorage.getItem("restpro_role");
  const token = sessionStorage.getItem("restpro_token");
  if (!token || currentRole !== role) {
    if (messageElement) messageElement.innerHTML = `Please log in with an ${role} account to view this page. <a href="login.html">Go to login</a>.`;
    return false;
  }
  return true;
}

async function initOwnerDashboardPage() {
  const message = document.getElementById("ownerDashboardMessage");
  const list = document.getElementById("ownerApplicationsList");
  const token = sessionStorage.getItem("restpro_token");
  if (!message || !list) return;
  if (!token) { message.innerHTML = 'Please <a href="login.html">log in</a> to continue.'; return; }
  message.textContent = "Loading your application status...";
  try {
    const response = await fetch(`${RESTPRO_API_URL}/owner-applications/my`, { headers: { "Authorization": `Bearer ${token}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Could not load application status.");
    const applications = data.applications || data.ownerApplications || (data.application ? [data.application] : []);
    if (!applications.length) {
      message.textContent = "You haven't submitted an owner application yet.";
      list.innerHTML = '<a class="btn" href="owner-application.html">Apply to become a partner</a>';
      return;
    }
    message.textContent = "Your owner application(s):";
    list.innerHTML = applications.map(app => {
      const status = String(app.status || "pending").toLowerCase();
      const label = status.charAt(0).toUpperCase() + status.slice(1);
      return `<article class="form-card" style="margin:1rem 0"><h3>${escapeRestProText(app.restaurantName || "Restaurant application")}</h3><p>${escapeRestProText(app.address || "")}</p><p><strong>Status:</strong> ${escapeRestProText(label)}</p>${status === "approved" ? '<p>Your application is approved. You can use the owner dashboard.</p>' : status === "rejected" ? '<p>Your application was rejected. Please contact the administrator for details.</p>' : '<p>Waiting for admin review.</p>'}</article>`;
    }).join("");
  } catch (error) {
    message.textContent = error.message === "Failed to fetch" ? "Cannot reach RestPro backend. Make sure the backend is running." : error.message;
  }
}

async function initAdminApplicationsPage() {
  const message = document.getElementById("adminApplicationsMessage");
  const list = document.getElementById("adminApplicationsList");
  const token = sessionStorage.getItem("restpro_token");
  if (!message || !list) return;
  if (!token) { message.innerHTML = 'Please <a href="login.html">log in</a> with the admin account.'; return; }
  if (sessionStorage.getItem("restpro_role") !== "admin") { message.textContent = "This page is only available to an admin account. Log out and sign in as admin."; return; }
  message.textContent = "Loading pending applications...";
  try {
    const response = await fetch(`${RESTPRO_API_URL}/owner-applications/pending`, { headers: { "Authorization": `Bearer ${token}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Could not load pending applications.");
    const applications = data.applications || data.ownerApplications || (Array.isArray(data) ? data : []);
    if (!applications.length) { message.textContent = "No pending applications found. Applications submitted through Become a Partner will appear here while their status is pending."; list.innerHTML = ""; return; }
    message.textContent = "Review each application below.";
    list.innerHTML = applications.map(app => `<article class="form-card" style="margin:1rem 0"><h3>${escapeRestProText(app.restaurantName || "Restaurant application")}</h3><p><strong>Address:</strong> ${escapeRestProText(app.address || "—")}</p><p><strong>Phone:</strong> ${escapeRestProText(app.phone || "—")}</p><p><strong>Cuisine:</strong> ${escapeRestProText(app.cuisineType || "—")}</p><p><strong>Description:</strong> ${escapeRestProText(app.description || "—")}</p><p><strong>Applicant:</strong> ${escapeRestProText(app.applicant?.name || app.applicant?.email || "—")}</p><div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1rem"><button class="btn" type="button" data-review-id="${escapeRestProText(app._id || app.id || "")}" data-review-status="approved">Approve</button><button class="btn btn-secondary" type="button" data-review-id="${escapeRestProText(app._id || app.id || "")}" data-review-status="rejected">Reject</button></div></article>`).join("");
    list.querySelectorAll("button[data-review-id]").forEach(button => button.addEventListener("click", async () => {
      const id = button.dataset.reviewId;
      const status = button.dataset.reviewStatus;
      if (!id || !confirm(`${status === "approved" ? "Approve" : "Reject"} this application?`)) return;
      button.disabled = true;
      try {
        const reviewResponse = await fetch(`${RESTPRO_API_URL}/owner-applications/${encodeURIComponent(id)}/review`, {
          method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ status })
        });
        const reviewData = await reviewResponse.json().catch(() => ({}));
        if (!reviewResponse.ok) throw new Error(reviewData.message || "Review failed.");
        message.textContent = `Application ${status}.`;
        await initAdminApplicationsPage();
      } catch (error) { message.textContent = error.message; button.disabled = false; }
    }));
  } catch (error) {
    message.textContent = error.message === "Failed to fetch" ? "Cannot reach RestPro backend. Make sure the backend is running." : error.message;
  }
}

function escapeRestProText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

// Ensure live search works robustly on reservation page
document.addEventListener("DOMContentLoaded", () => {
  const liveInput = document.getElementById("liveRestaurantSearchInput");
  const dropdown = document.getElementById("liveSearchDropdown");
  
  if (liveInput && dropdown) {
    liveInput.addEventListener("input", function() {
      const q = this.value.toLowerCase().trim();
      if (q === "") {
        dropdown.style.display = "none";
        return;
      }
      const matches = mockRestaurants.filter(r => 
        r.name.toLowerCase().includes(q) || 
        r.location.toLowerCase().includes(q) || 
        r.cuisine.toLowerCase().includes(q)
      );
      
      if (matches.length === 0) {
        dropdown.innerHTML = '<div style="padding:12px 16px; font-size:0.9rem; color:#64748b;">No matching restaurants found</div>';
        dropdown.style.display = "block";
        return;
      }
      
      dropdown.innerHTML = matches.map(m => `
        <div onclick="window.pickSearchedRest(${m.id})" style="padding:12px 16px; cursor:pointer; border-bottom:1px solid #f1f5f9; background:#fff;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'">
          <div style="font-weight:800; font-size:1rem; color:#0f172a;">${m.name} <span style="font-size:0.8rem; background:#e2e8f0; padding:2px 8px; border-radius:4px; margin-left:6px;">${m.type}</span></div>
          <div style="font-size:0.85rem; color:#64748b; margin-top:2px;">📍 ${m.location} | 🍽️ ${m.cuisine}</div>
        </div>
      `).join('');
      dropdown.style.display = "block";
    });

    document.addEventListener("click", function(e) {
      if (!liveInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });
  }
});

window.pickSearchedRest = function(id) {
  const r = mockRestaurants.find(item => item.id == id);
  if (!r) return;
  
  const liveInput = document.getElementById("liveRestaurantSearchInput");
  const dropdown = document.getElementById("liveSearchDropdown");
  const restSelect = document.getElementById("bookingRestaurant");
  
  if (liveInput) liveInput.value = r.name;
  if (dropdown) dropdown.style.display = "none";
  if (restSelect) {
    restSelect.value = r.id;
  }
  
  const bannerName = document.getElementById("bannerRestName");
  const bannerLoc = document.getElementById("bannerRestLoc");
  if (bannerName) bannerName.textContent = r.name;
  if (bannerLoc) bannerLoc.textContent = "📍 " + r.location;
  
  // Update pre-order dishes and floor plan for this specific restaurant
  if (typeof updatePreOrderMenu === 'function') updatePreOrderMenu();
  if (typeof renderFloorPlan === 'function') renderFloorPlan();
};

// Seed initial mock bookings so that some tables show up as Reserved (red) by default


// Ensure pre-order menu dynamically updates immediately whenever a restaurant is selected via search
window.pickSearchedRest = function(id) {
  const r = mockRestaurants.find(item => item.id == id);
  if (!r) return;
  
  const liveInput = document.getElementById("liveRestaurantSearchInput");
  const dropdown = document.getElementById("liveSearchDropdown");
  const restSelect = document.getElementById("bookingRestaurant");
  
  if (liveInput) liveInput.value = r.name;
  if (dropdown) dropdown.style.display = "none";
  if (restSelect) {
    restSelect.value = r.id;
  }
  
  const bannerName = document.getElementById("bannerRestName");
  const bannerLoc = document.getElementById("bannerRestLoc");
  if (bannerName) bannerName.textContent = r.name;
  if (bannerLoc) bannerLoc.textContent = "📍 " + r.location;
  
  // Instantly update pre-order menu items and floor plan for this specific restaurant
  if (typeof updatePreOrderMenu === 'function') {
    updatePreOrderMenu();
  }
  if (typeof renderFloorPlan === 'function') {
    renderFloorPlan();
  }
};

// Booking window validation (Max 20 days in advance)
function validateBookingWindow(dateStr, timeStr) {
  // dateStr is DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length !== 3) return true;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  
  // Parse timeStr like "08:00 AM"
  let [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  
  const bookingDate = new Date(year, month, day, hours, minutes);
  const now = new Date();
  
  const diffMs = bookingDate - now;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  if (diffDays > 20) {
    alert("Customers can only reserve prior to 20 days.");
    return false;
  }
  return true;
}

// Hook into form submission validation
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("reservationForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      const dateVal = document.getElementById("bookingDate")?.value;
      const timeVal = document.getElementById("bookingTime")?.value;
      if (dateVal && timeVal) {
        if (!validateBookingWindow(dateVal, timeVal)) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      }
    }, true);
  }
});

// Ensure updatePreOrderMenu is robustly triggered on restaurant change and page load
document.addEventListener("DOMContentLoaded", () => {
  const restSelect = document.getElementById("bookingRestaurant");
  if (restSelect) {
    restSelect.addEventListener("change", () => {
      if (typeof updatePreOrderMenu === 'function') updatePreOrderMenu();
      if (typeof renderFloorPlan === 'function') renderFloorPlan();
    });
  }
});

// Dynamic Meal-Timing Filtering for Pre-Order Menu
window.updatePreOrderMenu = function() {
  const restSelect = document.getElementById("bookingRestaurant");
  const curRestId = restSelect ? restSelect.value : null;
  const selectedRest = mockRestaurants.find(r => r.id == curRestId) || null;
  const preOrderContainer = document.getElementById("preOrderDishesContainer");
  const timeSlot = document.getElementById("bookingTime")?.value || "08:00 AM";
  
  // Determine meal session from time slot
  let session = "Morning";
  if (timeSlot.includes("PM")) {
    let hour = parseInt(timeSlot.split(':')[0], 10);
    if (hour === 12 || hour < 4) session = "Lunch";
    else session = "Dinner";
  } else {
    let hour = parseInt(timeSlot.split(':')[0], 10);
    if (hour >= 11) session = "Lunch";
    else session = "Morning";
  }
  
  if (preOrderContainer && selectedRest && selectedRest.fullMenu) {
    // Show the restaurant's complete menu for pre-order, regardless of selected time slot.
    const dishesToShow = selectedRest.fullMenu;
    
    preOrderContainer.innerHTML = dishesToShow.map((m, idx) => `
      <div class="preorder-item-row" style="display:flex; align-items:center; justify-content:space-between; gap:10px; background:#f8fafc; padding:10px 14px; border-radius:8px; border:1px solid #cbd5e1; margin-bottom:8px;">
        <div style="flex:1;">
          <div style="font-weight:800; font-size:0.95rem; color:#0f172a;">${m.name}</div>
          <div style="font-size:0.8rem; color:#64748b; margin-top:2px;">₹${m.price} • <span style="color:#0284c7; font-weight:600;">${m.timing || session}</span></div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button type="button" class="btn-qty" onclick="adjustPreOrderQty('${m.name}', -1)" style="background:#e2e8f0; color:#0f172a; border:none; width:30px; height:30px; border-radius:6px; font-weight:bold; cursor:pointer;">-</button>
          <span id="qty-${m.name.replace(/\s+/g, '-')}" style="font-weight:800; font-width:1rem; min-width:24px; text-align:center;">0</span>
          <button type="button" class="btn-qty" onclick="adjustPreOrderQty('${m.name}', 1)" style="background:var(--primary-color); color:#fff; border:none; width:30px; height:30px; border-radius:6px; font-weight:bold; cursor:pointer;">+</button>
        </div>
      </div>
    `).join('');
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const timeSelect = document.getElementById("bookingTime");
  if (timeSelect) {
    timeSelect.addEventListener("change", () => {
      if (typeof updatePreOrderMenu === 'function') updatePreOrderMenu();
    });
  }
});

// Robust pre-order quantity adjustment with max item limit = 4
window.preOrderQuantities = window.preOrderQuantities || {};

window.adjustPreOrderQty = function(dishName, delta) {
  window.preOrderQuantities[dishName] = window.preOrderQuantities[dishName] || 0;
  let newQty = window.preOrderQuantities[dishName] + delta;
  
  if (newQty < 0) newQty = 0;
  if (newQty > 4) {
    alert("Maximum 4 quantities allowed per pre-ordered dish item.");
    newQty = 4;
  }
  
  window.preOrderQuantities[dishName] = newQty;
  
  // Update UI span
  const spanId = "qty-" + dishName.replace(/\s+/g, '-');
  const spanEl = document.getElementById(spanId);
  if (spanEl) {
    spanEl.textContent = newQty;
  }
};

// Dynamic Recommendation Adaptation Based on Latest Booking / Restaurant
window.updateTailoredRecommendations = function(restaurantId) {
  const recList = document.getElementById("recommendationList");
  const recSectionHeading = document.getElementById("recommendationHeading");
  if (!recList) return;
  
  const rest = mockRestaurants.find(r => r.id == restaurantId) || mockRestaurants[0];
  if (!rest) return;
  
  if (recSectionHeading) recSectionHeading.style.display = "block";
  recList.style.display = "grid";
  
  // Recommend dishes or complementary items from this specific restaurant
  const items = rest.fullMenu.slice(0, 3);
  recList.innerHTML = items.map(m => `
    <div style="background:rgba(255,255,255,0.95); padding:14px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.15); display:flex; align-items:center; gap:12px;">
      <img src="${m.image}" style="width:60px; height:60px; border-radius:8px; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=200&q=80'">
      <div>
        <h4 style="font-size:0.95rem; font-weight:800; color:#0f172a; margin-bottom:2px;">${m.name}</h4>
        <p style="font-size:0.8rem; color:#475569; margin-bottom:4px;">${rest.name} • ₹${m.price}</p>
        <span style="font-size:0.75px; background:#dcfce7; color:#166534; padding:2px 6px; border-radius:4px; font-weight:700;">★ Recommended for your booking</span>
      </div>
    </div>
  `).join('');
};

document.addEventListener("DOMContentLoaded", () => {
  const restSelect = document.getElementById("bookingRestaurant");
  if (restSelect) {
    restSelect.addEventListener("change", () => {
      if (typeof updateTailoredRecommendations === 'function') {
        updateTailoredRecommendations(restSelect.value);
      }
    });
  }
});

// Advanced Context-Aware Smart Recommendations based on Cuisine, Non-Veg/Veg preference, and Table Capacity

function getMappedRecommendationNames(restaurantName) {
  const name = String(restaurantName || "").toLowerCase();
  if (name.includes("murugan")) return ["Saravana Bhavan", "A2B", "Sangeetha Veg Restaurant"];
  if (name.includes("saravana")) return ["A2B", "Sangeetha Veg Restaurant", "Murugan Idli Shop"];
  if (name.includes("a2b") || name.includes("adyar ananda")) return ["Saravana Bhavan", "Sangeetha Veg Restaurant", "Murugan Idli Shop"];
  if (name.includes("sangeetha")) return ["Saravana Bhavan", "A2B", "Murugan Idli Shop"];
  if (name.includes("amman")) return ["Junior Kuppanna", "Anjappar Chettinad Restaurant", "Dindigul Thalappakatti"];
  if (name.includes("dindigul") || name.includes("thalappakatti")) return ["Junior Kuppanna", "Anjappar Chettinad Restaurant", "Amman Mess"];
  if (name.includes("anjappar")) return ["Junior Kuppanna", "Dindigul Thalappakatti", "Amman Mess"];
  if (name.includes("junior kuppanna")) return ["Anjappar Chettinad Restaurant", "Dindigul Thalappakatti", "Amman Mess"];
  return [];
}

function findMappedRestaurants(restaurantName) {
  const targets = getMappedRecommendationNames(restaurantName);
  return targets.map(target => mockRestaurants.find(r => {
    const actual = String(r.name || "").toLowerCase();
    const wanted = target.toLowerCase();
    return actual === wanted || (wanted === "a2b" && (actual.includes("a2b") || actual.includes("adyar ananda bhavan"))) ||
      (wanted !== "a2b" && actual.includes(wanted));
  })).filter(Boolean);
}

window.updateSmartRecommendations = function(selectedRestId, guestCount, selectedTime) {
  const recList = document.getElementById("recommendationList");
  const recSectionHeading = document.getElementById("recommendationHeading");
  if (!recList) return;

  const currentRest = mockRestaurants.find(r => r.id == selectedRestId) || mockRestaurants[0];
  if (!currentRest) return;

  if (recSectionHeading) recSectionHeading.style.display = "block";
  recList.style.display = "grid";

  const recommendations = findMappedRestaurants(currentRest.name).slice(0, 1);

  recList.innerHTML = recommendations.map(r => `
    <div style="background:rgba(255,255,255,0.95); padding:14px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.15); display:flex; align-items:center; gap:12px;">
      <img src="${r.fullMenu[0].image}" style="width:65px; height:65px; border-radius:8px; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=200&q=80'">
      <div style="flex:1;">
        <h4 style="font-size:0.95rem; font-weight:800; color:#0f172a; margin-bottom:2px;">${r.name}</h4>
        <p style="font-size:0.8rem; color:#475569; margin-bottom:4px;">${r.location} • ⭐ ${r.rating}</p>
        <span style="font-size:0.75rem; background:#dcfce7; color:#166534; padding:2px 6px; border-radius:4px; font-weight:700;">★ Recommended Alternative</span>
      </div>
    </div>
  `).join('');
};



document.addEventListener("DOMContentLoaded", () => {
  const restSelect = document.getElementById("bookingRestaurant");
  const guestSelect = document.getElementById("bookingGuests");
  const timeSelect = document.getElementById("bookingTime");

  const triggerSmartRecs = () => {
    const rId = restSelect ? restSelect.value : 1;
    const gCount = guestSelect ? guestSelect.value : 2;
    const tSlot = timeSelect ? timeSelect.value : "08:00 AM";
    if (typeof updateSmartRecommendations === 'function') {
      updateSmartRecommendations(rId, gCount, tSlot);
    }
  };

  if (restSelect) restSelect.addEventListener("change", triggerSmartRecs);
  if (guestSelect) guestSelect.addEventListener("change", triggerSmartRecs);
  if (timeSelect) timeSelect.addEventListener("change", triggerSmartRecs);
});

// Ensure every restaurant floor plan shows pre-reserved tables realistically
// Smart Cross-Restaurant Alternative Recommendation Helper
function getSmartAlternativeRecommendations(currentRestId, guestCount, dateVal, timeVal) {
  const bookings = JSON.parse(localStorage.getItem("restpro_bookings") || "[]");
  const alternatives = [];

  mockRestaurants.forEach(r => {
    if (r.id == currentRestId) return;

    const bookedTableNumbers = bookings
      .filter(b => b.restaurantId == r.id && b.date === dateVal && b.time === timeVal)
      .map(b => b.tableNumber);

    const availableMatchingTables = r.tables.filter(t => t.capacity >= guestCount && !bookedTableNumbers.includes(t.number));

    if (availableMatchingTables.length > 0) {
      alternatives.push({
        restaurant: r,
        availableTable: availableMatchingTables[0]
      });
    }
  });

  return alternatives;
}

window.renderFloorPlan = function() {
  const restSelect = document.getElementById("bookingRestaurant");
  const floorContainer = document.getElementById("floorPlanVisualContainer");
  if (!floorContainer) return;

  const restId = restSelect ? restSelect.value : null;
  if (!restId) {
    floorContainer.innerHTML = '<div style="background:#1e293b; color:#94a3b8; border-radius:14px; padding:2rem; text-align:center; font-weight:600; border:1px solid #334155; margin-top:1rem;">📍 Please select a restaurant above to view its visual floor plan and available tables.</div>';
    return;
  }

  const selectedRest = mockRestaurants.find(r => r.id == restId);
  if (!selectedRest || !selectedRest.tables) return;

  const guestCountSelect = document.getElementById("guestCount");
  const guestCount = guestCountSelect ? parseInt(guestCountSelect.value, 10) : 2;

  const bookings = JSON.parse(localStorage.getItem("restpro_bookings") || "[]");
  const dateInput = document.getElementById("bookingDate");
  const dateVal = dateInput ? dateInput.value : "";
  const timeVal = document.getElementById("bookingTime")?.value || "08:00 AM";

  const bookedTableIds = bookings
    .filter(b => b.restaurantId == selectedRest.id && b.date === dateVal && b.time === timeVal && b.status === "Confirmed")
    .map(b => b.tableNumber);

  let suitableTables = selectedRest.tables.filter(t => t.capacity >= guestCount && !bookedTableIds.includes(t.number));
  suitableTables.sort((a, b) => a.capacity - b.capacity);
  let recommendedTableObj = suitableTables.length > 0 ? suitableTables[0] : selectedRest.tables[0];

  if (!selectedTableId || bookedTableIds.includes(selectedRest.tables.find(t => t.id === selectedTableId)?.number)) {
    selectedTableId = recommendedTableObj.id;
  }

  const currentReservedTables = [];

  let html = `
    <div style="background:#1e293b; color:#fff; border-radius:14px; padding:1.5rem; border:1px solid #334155; margin-top:1rem; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:0.75rem; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
        <div>
          <div style="font-size:1.05rem; font-weight:800; color:#f8fafc;">📍 Visual Restaurant Floor Plan</div>
          <div style="font-size:0.8rem; color:#94a3b8; margin-top:2px;">Interactive seating layout for ${selectedRest.name}</div>
        </div>
        <div style="font-size:0.75rem; color:#cbd5e1; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <span>🟢 Available</span>
          <span>🔴 Reserved</span>
          <span>🟧 Selected</span>
          <span>🟨 Too Small</span>
        </div>
      </div>

      <div style="background:#0f172a; border-radius:10px; padding:0.75rem 1rem; margin-bottom:1.25rem; border:1px solid #334155; font-size:0.85rem; color:#e2e8f0; display:flex; align-items:center; gap:8px;">
        <span>💡</span>
        <div><strong>Auto-Assigned Recommendation:</strong> ${recommendedTableObj ? 'Table #' + recommendedTableObj.number + ' (' + recommendedTableObj.capacity + '-seater)' : 'None available for party size'} <span style="color:#f59e0b; font-size:0.75rem; margin-left:4px;">(Click any available table to change)</span></div>
      </div>

      <div style="text-align:center; font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; font-weight:700; margin-bottom:0.75rem; padding:4px; background:#0f172a; border-radius:6px; border:1px dashed #475569;">
        🚪 MAIN ENTRANCE & RECEPTION DESK
      </div>

      <div class="layout-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:12px; margin-bottom:1rem;">
  `;

  selectedRest.tables.forEach(t => {
    const isPreReserved = currentReservedTables.includes(t.number) || bookedTableIds.includes(t.number);
    const isSelected = t.id === selectedTableId;
    const isTooSmall = t.capacity < guestCount;

    let bg = '#f0fdf4';
    let border = '#4ade80';
    let textColor = '#166534';
    let statusText = 'AVAILABLE';

    if (isPreReserved) {
      bg = '#fee2e2';
      border = '#f87171';
      textColor = '#991b1b';
      statusText = 'RESERVED';
    } else if (isSelected) {
      bg = '#fff7ed';
      border = '#f97316';
      textColor = '#c2410c';
      statusText = 'SELECTED';
    } else if (isTooSmall) {
      bg = '#fef9c3';
      border = '#fde047';
      textColor = '#854d0e';
      statusText = 'TOO SMALL';
    }

    const clickAction = (isPreReserved || isTooSmall) ? `handleTableClick('${t.id}')` : `selectTable('${t.id}')`;

    html += `
      <div onclick="${clickAction}" style="background:${bg}; border:2.5px solid ${border}; border-radius:12px; padding:12px 8px; text-align:center; cursor:pointer; transition:all 0.2s; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
        <div style="font-weight:900; font-size:1rem; color:${textColor};">Table ${t.number}</div>
        <div style="font-size:0.75rem; font-weight:700; color:#475569; margin-top:3px;">${t.capacity}-Seater</div>
        <div style="font-size:0.7rem; font-weight:800; color:${textColor}; margin-top:6px; background:rgba(255,255,255,0.6); padding:2px 4px; border-radius:4px;">${statusText}</div>
      </div>
    `;
  });

  html += `
      </div>

      <div style="text-align:center; font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; font-weight:700; margin-top:0.75rem; padding:4px; background:#0f172a; border-radius:6px; border:1px dashed #475569;">
        🍳 KITCHEN & SERVICE COUNTER AREA
      </div>
    </div>
  `;

  floorContainer.innerHTML = html;
};

window.selectTable = function(tableId) {
  selectedTableId = tableId;
  if (typeof window.renderFloorPlan === 'function') {
    window.renderFloorPlan();
  }
};


window.handleTableClick = function(tableId) {
  const restSelect = document.getElementById("bookingRestaurant");
  const restId = restSelect ? restSelect.value : "1";
  const selectedRest = mockRestaurants.find(r => r.id == restId) || mockRestaurants[0];
  if (!selectedRest || !selectedRest.tables) return;

  const tableObj = selectedRest.tables.find(t => t.id === tableId);
  if (!tableObj) return;

  const guestCountSelect = document.getElementById("guestCount");
  const guestCount = guestCountSelect ? parseInt(guestCountSelect.value, 10) : 2;
  const dateVal = document.getElementById("bookingDate")?.value || "";
  const timeVal = document.getElementById("bookingTime")?.value || "08:00 AM";

  const bookings = JSON.parse(
  localStorage.getItem("restpro_bookings") || "[]"
);

const bookedTableIds = bookings
  .filter(
    b =>
      b.restaurantId == selectedRest.id &&
      b.date === dateVal &&
      b.time === timeVal &&
      b.status === "Confirmed"
  )
  .map(b => b.tableNumber);

const isBooked = bookedTableIds.includes(tableObj.number);

const isTooSmall = tableObj.capacity < guestCount;

  let modalId = "tableReservedModalOverlay";
  let existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = modalId;
  overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.75); z-index:9999; display:flex; justify-content:center; align-items:center; padding:1rem; backdrop-filter:blur(5px);";

  overlay.innerHTML = `
    <div style="background:#0f172a; color:#fff; width:100%; max-width:480px; border-radius:16px; padding:2rem; border:2px solid #334155; box-shadow:0 25px 50px rgba(0,0,0,0.5); text-align:center;">
      <div style="font-size:3rem; margin-bottom:0.75rem;">🔒</div>
      <h3 style="margin:0 0 0.5rem 0; color:#f8fafc; font-size:1.35rem;">Table #${tableObj.number} is Already Reserved</h3>
      <p style="color:#cbd5e1; font-size:0.95rem; margin-bottom:1.5rem; line-height:1.5;">
        ${isBooked ? `This table at <strong>${selectedRest.name}</strong> is already booked for ${dateVal} at ${timeVal}. Please choose another available table on the floor plan.` : `This table's capacity (${tableObj.capacity}-seater) is smaller than your party size of ${guestCount} guests.`}
      </p>
      <button type="button" onclick="document.getElementById('${modalId}').remove()" class="btn" style="width:100%; background:#f59e0b; color:#000; font-weight:800; padding:12px; border-radius:8px; border:none; cursor:pointer; font-size:1rem;">Choose Another Table</button>
    </div>
  `;

  document.body.appendChild(overlay);
};





// Keep the browser cache in sync with the authenticated MongoDB reservation records.
document.addEventListener("DOMContentLoaded", () => { syncRestProBookings(); });
