function getUserRole() {
  const user =
    JSON.parse(localStorage.getItem("user")) ||
    JSON.parse(sessionStorage.getItem("user"));

  return user ? user.role : null;
}

function getFacilityPage() {
  const role = getUserRole();

  if (role === "staff") {
    return "staff.html";
  }

  if (role === "admin") {
    return "admin.html";
  }

  return "student.html";
}

function loadLayout(activePage) {
  const role = getUserRole();

  document.getElementById("appHeader").innerHTML = `
    <header class="app-header">
      <div class="logo-area">
        <div class="menu-icon">☰</div>

        <img src="images/Inti_Logo.png" style="height: 36px; object-fit: contain;">

        <div class="system-title">
          Facilities Management System
        </div>
      </div>
    </header>
  `;

  if (role === "admin") {
  document.getElementById("appSidebar").innerHTML = `
    <aside class="sidebar admin-sidebar">

        <a href="admin.html"
        class="${activePage === "admin-dashboard" ? "active" : ""}">
        <span class="sidebar-icon">
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
            <path d="M120-520v-320h320v320H120Zm0 400v-320h320v320H120Zm400-400v-320h320v320H520Zm0 400v-320h320v320H520ZM200-600h160v-160H200v160Zm400 0h160v-160H600v160Zm0 400h160v-160H600v160Zm-400 0h160v-160H200v160Z"/>
          </svg>
        </span>
        <span>Dashboard</span>
      </a>

        <a href="manage-users.html"
          class="${activePage === "manage-users" ? "active" : ""}">
          <span class="sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
              <path d="M40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Zm720 0v-120q0-44-24.5-84.5T666-434q51 6 96 20.5t84 35.5q36 20 55 44.5t19 53.5v120H760ZM247-527q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47Zm466 0q-47 47-113 47-11 0-28-2.5t-28-5.5q27-32 41.5-71t14.5-81q0-42-14.5-81T544-792q14-5 28-6.5t28-1.5q66 0 113 47t47 113q0 66-47 113ZM120-240h480v-32q0-11-5.5-20T580-306q-54-27-109-40.5T360-360q-56 0-111 13.5T140-306q-9 5-14.5 14t-5.5 20v32Zm296.5-343.5Q440-607 440-640t-23.5-56.5Q393-720 360-720t-56.5 23.5Q280-673 280-640t23.5 56.5Q327-560 360-560t56.5-23.5ZM360-240Zm0-400Z"/>            </svg>
          </span>
          <span>Manage Users</span>
        </a>

        

        <a href="manage-facilities.html"
           class="${activePage === "manage-facilities" ? "active" : ""}">
          <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M120-120v-560h160v-160h400v320h160v400H520v-160h-80v160H120Zm80-80h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm160 160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm160 320h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm160 480h80v-80h-80v80Zm0-160h80v-80h-80v80Z"/></svg>
          </span>
          <span>Manage Facilities</span>
        </a>

        <a href="manage-bookings.html"
           class="${activePage === "manage-bookings" ? "active" : ""}">
          <span class="sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor">
              <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm80-160h280v-80H280v80Zm0-160h400v-80H280v80Zm0-160h400v-80H280v80Z"/>
            </svg>
          </span>
          <span>Manage Bookings</span>
        </a>

        <a href="key-management.html"
            class="${activePage === "key-management" ? "active" : ""}">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M223.5-423.5Q200-447 200-480t23.5-56.5Q247-560 280-560t56.5 23.5Q360-513 360-480t-23.5 56.5Q313-400 280-400t-56.5-23.5ZM280-240q-100 0-170-70T40-480q0-100 70-170t170-70q67 0 121.5 33t86.5 87h352l120 120-180 180-80-60-80 60-85-60h-47q-32 54-86.5 87T280-240Zm0-80q56 0 98.5-34t56.5-86h125l58 41 82-61 71 55 75-75-40-40H435q-14-52-56.5-86T280-640q-66 0-113 47t-47 113q0 66 47 113t113 47Z"/></svg>
            </span>

            <span>Key Management</span>
          </a>

        <a href="notifications.html"
          class="${activePage === "notifications" ? "active" : ""}">
          <span class="sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg" height="22px"
                viewBox="0 -960 960 960" width="22px" fill="currentColor">
              <path d="M160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820v28q80 20 130 84.5T720-560v280h80v80H160Zm320-300Zm0 420q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80ZM320-280h320v-280q0-66-47-113t-113-47q-66 0-113 47t-47 113v280Z"/>
            </svg>
          </span>
          <span>Notifications</span>
        </a>

        <a href="reports.html"
           class="${activePage === "reports" ? "active" : ""}">
          <span class="sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor">
              <path d="M120-120v-80l80-80v160h-80Zm160 0v-240l80-80v320h-80Zm160 0v-320l80 81v239h-80Zm160 0v-239l80-80v319h-80Zm160 0v-400l80-80v480h-80ZM120-327v-113l280-280 160 160 280-280v113L560-447 400-607 120-327Z"/>
            </svg>
          </span>
          <span>Reports</span>
        </a>

        <a href="settings.html"
           class="${activePage === "settings" ? "active" : ""}">
          <span class="sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z"/></svg>
          </span>
          <span>Settings</span>
        </a>

        <a href="profile.html"
           class="${activePage === "profile" ? "active" : ""}">
          <span class="sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm146.5-204.5Q340-521 340-580t40.5-99.5Q421-720 480-720t99.5 40.5Q620-639 620-580t-40.5 99.5Q539-440 480-440t-99.5-40.5ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm100-95.5q47-15.5 86-44.5-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160q53 0 100-15.5ZM523-537q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Zm-43-43Zm0 360Z"/></svg>
          </span>
          <span>Profile</span>
        </a>

        <br><br>

        <a href="login.html" onclick="logout()">
          <span class="sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor">
              <path d="M216-120q-27 0-46.5-19.5T150-186v-588q0-27 19.5-46.5T216-840h294v80H216v588h294v80H216Zm444-160-56-58 102-102H360v-80h346L604-622l56-58 200 200-200 200Z"/>
            </svg>
          </span>
          <span>Logout</span>
        </a>

      </aside>
    `;
  } else {
    document.getElementById("appSidebar").innerHTML = `
      <aside class="sidebar">

        <a href="${getFacilityPage()}"
           class="${activePage === "facilities" ? "active" : ""}">
          <span class="sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg"
                 height="22px"
                 viewBox="0 -960 960 960"
                 width="22px"
                 fill="currentColor">
              <path d="M120-120v-560h160v-160h400v320h160v400H520v-160h-80v160H120Zm80-80h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm160 160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm160 320h80v-80h-80v80Zm0-160h80v-80h-80v80Zm0-160h80v-80h-80v80Zm160 480h80v-80h-80v80Zm0-160h80v-80h-80v80Z"/>
            </svg>
          </span>
          <span>Facilities</span>
        </a>

        <a href="activities.html"
           class="${activePage === "activities" ? "active" : ""}">
          <span class="sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg"
                 height="22px"
                 viewBox="0 -960 960 960"
                 width="22px"
                 fill="currentColor">
              <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h168q13-36 43.5-58t68.5-22q38 0 68.5 22t43.5 58h168q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm80-80h280v-80H280v80Zm0-160h400v-80H280v80Zm0-160h400v-80H280v80Z"/>
            </svg>
          </span>
          <span>Activities</span>
        </a>

        <a href="notifications.html"
           class="${activePage === "notifications" ? "active" : ""}">
          <span class="sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg"
                 height="22px"
                 viewBox="0 -960 960 960"
                 width="22px"
                 fill="currentColor">
              <path d="M160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820v28q80 20 130 84.5T720-560v280h80v80H160Zm320-300Zm0 420q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80ZM320-280h320v-280q0-66-47-113t-113-47q-66 0-113 47t-47 113v280Z"/>
            </svg>
          </span>
          <span>Notifications</span>
        </a>

        <a href="settings.html"
           class="${activePage === "settings" ? "active" : ""}">
          <span class="sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg"
                 height="22px"
                 viewBox="0 -960 960 960"
                 width="22px"
                 fill="currentColor">
              <path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z"/>
            </svg>
          </span>
          <span>Settings</span>
        </a>

        <a href="profile.html"
           class="${activePage === "profile" ? "active" : ""}">
          <span class="sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg"
                 height="22px"
                 viewBox="0 -960 960 960"
                 width="22px"
                 fill="currentColor">
              <path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm146.5-204.5Q340-521 340-580t40.5-99.5Q421-720 480-720t99.5 40.5Q620-639 620-580t-40.5 99.5Q539-440 480-440t-99.5-40.5ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/>
            </svg>
          </span>
          <span>Profile</span>
        </a>

        <br><br>

        <a href="#" onclick="logout()">
          <span class="sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg"
                 height="22px"
                 viewBox="0 -960 960 960"
                 width="22px"
                 fill="currentColor">
              <path d="M216-120q-27 0-46.5-19.5T150-186v-588q0-27 19.5-46.5T216-840h294v80H216v588h294v80H216Zm444-160-56-58 102-102H360v-80h346L604-622l56-58 200 200-200 200Z"/>
            </svg>
          </span>
          <span>Logout</span>
        </a>

      </aside>
    `;
  }

  if (localStorage.getItem("sidebarCollapsed") === "true") {
    document.body.classList.add("sidebar-collapsed");
  }

  const menuIcon = document.querySelector(".menu-icon");

  menuIcon.addEventListener("click", function () {
    document.body.classList.toggle("sidebar-collapsed");

    localStorage.setItem(
      "sidebarCollapsed",
      document.body.classList.contains("sidebar-collapsed")
    );
  });
}