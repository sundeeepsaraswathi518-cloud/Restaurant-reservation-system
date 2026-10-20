RestPro — FRONTEND ONLY (Backend API Connected)

This archive contains frontend files only. It does not contain or replace backend files.

Files included:
- index.html
- restaurants.html
- reservation.html
- my-reservations.html
- login.html
- register.html
- restaurant-menu.html
- favourites.html
- owner-application.html (submit owner application)
- owner-dashboard.html (view application status)
- admin-applications.html (admin approve/reject UI)
- script.js
- style.css

Backend integration:
- API base URL: http://localhost:5000/api
- POST /api/auth/register
- POST /api/auth/login
- POST /api/reservations (Bearer token required)
- GET /api/reservations/my (Bearer token required)
- PATCH /api/reservations/:id/cancel (Bearer token required)
- POST /api/owner-applications (Bearer token required)
- GET /api/owner-applications/my (Bearer token required)
- GET /api/owner-applications/pending (admin token required)
- PATCH /api/owner-applications/:id/review (admin token required)
- My Bookings refreshes from the backend and displays occasion, special requests, dietary preferences, pre-order items, and booking status.
- Reservation requests include restaurantName, numberOfGuests, reservationDate, reservationSlot, tableNumber, preOrderItems, occasion, specialRequest, and dietaryPreferences.
- Keeps the one-mapped-restaurant recommendation behavior.

Install:
1. Back up your existing Frontend folder.
2. Extract this ZIP.
3. Copy the files inside this ZIP into your existing Frontend folder, replacing matching frontend files only.
4. Do not replace, move, or delete your backend folder.
5. Start the backend from its backend folder with `node server.js`. It should be available at http://localhost:5000.
6. Open the frontend using your usual local development server if you have one.
7. Log in and create a NEW test booking to verify the new optional fields. Existing database records will not gain values retroactively.

Important:
- The backend Reservation model must include occasion, specialRequest, and dietaryPreferences, and the controller must save those fields.
- Do not put .env files, database URIs, JWT secrets, or credentials in this frontend archive.
- Email delivery is not configured by this frontend.

Owner application flow: register/login as a customer, use Become a Partner to apply, then an admin logs in and uses Owner Applications to approve/reject. Login redirects admins to the review page and owners to the owner dashboard. If an account was already logged in before its role changed, log out and log in again to refresh the role stored by the frontend.


Frontend/backend integration notes:
- This frontend calls the existing backend at http://localhost:5000/api.
- Start the RestPro Node/Express backend before using login, reservations, or Become a Partner.
- The Become a Partner form posts to POST /api/owner-applications with the logged-in user's Bearer token.
- Submitted applications are saved by the backend in MongoDB's ownerapplications collection.
- The admin applications page requests GET /api/owner-applications/pending and shows pending applications only.
- Open the HTML files through your existing local frontend setup; do not put backend secrets in frontend files.


Login redirect fix: the normal Customer Login page now redirects to reservation.html after successful login. The dedicated admin-login.html redirects to admin-applications.html. If the account role in MongoDB is incorrect, fix the role in the database; frontend navigation does not change backend permissions.


Navigation fix: Removed the Owner Dashboard link from the shared public navigation so it no longer appears on customer-facing pages. The owner-dashboard.html page remains in the package and can still be opened directly.


TEACHER / DEMO LOGIN NOTE
- This frontend does not bundle a database or create teacher accounts.
- Start the RestPro backend and connect it to the intended MongoDB database before testing.
- Sign in with an account that already exists in that database (admin account for admin-login.html).
- Authentication is stored for the current browser session; old persistent login keys are cleared when the site loads.
- If sharing the project on another computer, provide the backend and database setup separately, and do not share your private .env secrets.
