# Manual Test Cases: User Sign Up (Registration)
## Naaya — Hyper-Local Social Network

**Document Version:** 1.0  
**Tester:** Jinesh Basnet  
**Date:** 2026-04-09  
**Environment:** Development — Frontend: `http://localhost:3000` | Backend: `http://localhost:5000` | DB: MongoDB (Local)

---

## ✅ Global Pre-conditions

1. Backend and Frontend servers are running on ports 5000 and 3000.
2. MongoDB database is active.
3. Access to `http://localhost:3000/register`.

---

# MODULE: SIGN UP (REGISTRATION)

**Page:** `RegisterPage.tsx` | **Backend Route:** `/api/auth/register`

---

### TC-SIGNUP-01 ✅ Successful Registration (Positive Case)
**Description:** Verify a new user can register with all valid details.

| Field | Value |
|:---|:---|
| **Full Name** | Ram Bahadur |
| **Username** | rambahadur_99 |
| **Email** | ram.test@example.com |
| **Phone** | 9811223344 |
| **Province** | Province No. 3 (Bagmati Province) |
| **District** | Kathmandu |
| **City** | Koteshwor |
| **Language** | Both |
| **Password** | Ram@Test1234 |
| **Confirm PW** | Ram@Test1234 |

**Test Steps:**
1. Navigate to the Sign Up page.
2. Enter all details accurately as per the table above.
3. Click "Create Account".

**Expected Result:**
- Button shows "Creating..." during processing.
- Success toast notification: "Welcome to नाया! Account created."
- User is automatically redirected to `/home`.
- New user record exists in the database.

**Status:** ⬜ PENDING

---

### TC-SIGNUP-02 ❌ Client-Side Validation: Empty Required Fields
**Description:** Verify validation errors appear for mandatory fields when left empty.

**Test Steps:**
1. Navigate to the Sign Up page.
2. Leave all fields blank and click "Create Account".

**Expected Result:**
- "Required" error message appears under: Full Name, Username, Email, Province, District, City, Password.
- No network request is triggered.

**Status:** ⬜ PENDING

---

### TC-SIGNUP-03 ❌ Client-Side Validation: Invalid Patterns
**Description:** Verify validation for specific field formats.

**Test Steps:**
1. **Full Name:** Enter "A" (Too short).
2. **Username:** Enter "user @123" (Special characters/spaces).
3. **Email:** Enter "invalid-email" (No @ or domain).
4. **Phone:** Enter "1234567890" (Not starting with 98 or wrong length).
5. **Password:** Enter "weak" (Less than 8 chars).A11

**Expected Results:**
- Full Name: "Too short"
- Username: "Alphanumeric only"
- Email: "Invalid email"
- Phone: "Invalid phone format"
- Password: "Min 8 chars"

**Status:** ⬜ PENDING

---

### TC-SIGNUP-04 ❌ Password Strength & Complexity
**Description:** Verify password complexity requirements.

**Test Steps:**
1. Enter `abcdefgh` (No Upper, Number, or Special char).
2. Enter `Abcdefgh1` (No Special char).
3. Enter `Abcdefgh@` (No Number).

**Expected Result:**
- Error message: "Must include Upper, Lower, Number, Special char".
- Password strength bar does not reach maximum green level.

**Status:** ⬜ PENDING

---

### TC-SIGNUP-05 ❌ Password Confirmation Mismatch
**Description:** Verify error when Password and Confirm Password do not match.

**Test Steps:**
1. Enter `Test@1234` in Password.
2. Enter `Test@5678` in Confirm Password.

**Expected Result:**
- Error message: "Passwords do not match".

**Status:** ⬜ PENDING

---

### TC-SIGNUP-06 🔄 Location Logic: Province-District Cascading
**Description:** Verify District dropdown only shows districts relevant to the selected Province.

**Test Steps:**
1. Choose "Province No. 1 (Koshi Province)".
2. Open District dropdown.
3. Choose "Province No. 3 (Bagmati Province)".
4. Open District dropdown.

**Expected Result:**
- For Koshi: Shows "Jhapa", "Morang", etc. (14 districts).
- For Bagmati: Shows "Kathmandu", "Lalitpur", etc. (13 districts).
- Changing Province resets the District selection.

**Status:** ⬜ PENDING

---

### TC-SIGNUP-07 ❌ Backend Validation: Duplicate Username
**Description:** Verify registration fails if the username is already taken.

**Test Steps:**
1. Try to register with username `jineshbasnet002` (existing user).
2. Use unique email and other details.

**Expected Result:**
- Error toast from backend (e.g., "User already exists").
- Registration does not complete.

**Status:** ⬜ PENDING

---

### TC-SIGNUP-08 ❌ Backend Validation: Duplicate Email
**Description:** Verify registration fails if the email is already in use.

**Test Steps:**
1. Try to register with an already registered email.
2. Use a unique username.

**Expected Result:**
- Error message indicating the email is already registered.

**Status:** ⬜ PENDING

---

### TC-SIGNUP-09 ❌ Backend Validation: Duplicate Phone
**Description:** Verify registration fails if the phone number already exists.

**Test Steps:**
1. Enter a phone number already associated with another account (e.g., 9843462048).

**Expected Result:**
- Backend returns an error regarding duplicate phone.

**Status:** ⬜ PENDING

---

### TC-SIGNUP-10 📱 UI/UX: Responsive Design
**Description:** Verify the sign up page is usable on mobile devices.

**Test Steps:**
1. Open the page in mobile view (e.g., iPhone SE/12 Pro simulator).

**Expected Result:**
- Layout stacks vertically.
- All inputs are easily clickable.
- No horizontal scrolling.

**Status:** ⬜ PENDING

---

### TC-SIGNUP-11 🔗 Navigation: Login Link
**Description:** Verify user can navigate back to login.

**Test Steps:**
1. Click on "Log In".

**Expected Result:**
- URL changes to `/login`.
- `LoginPage` loads.

**Status:** ⬜ PENDING
