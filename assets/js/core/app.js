/**
 * Router - Core Navigation Logic
 * จัดการการเปลี่ยนหน้า (Routing) และโหลด Resource แบบ Dynamic
 */
const Router = {
    /**
     * Load a page dynamically
     * @param {string} pageName - Name of the folder/file (e.g. 'dashboard', 'form')
     * @param {any} param - Optional parameter to pass to the page's init function
     */
    load: async (pageName, param = null) => {
        Router.toggleLoading(true);

        try {
            // 1. Navbar Active State
            document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
            const navBtn = document.getElementById(`nav-${pageName}`);
            if (navBtn) navBtn.classList.add('active');

            // 2. Load HTML
            const response = await fetch(`pages/${pageName}/${pageName}.html`);
            if (!response.ok) throw new Error("Page not found");
            const html = await response.text();
            document.getElementById('app-content').innerHTML = html;

            // 3. Load Page CSS
            const style = document.getElementById('page-style');
            if (style) style.href = `pages/${pageName}/${pageName}.css`;

            // 4. Load Page JS
            const oldScript = document.getElementById('page-script');
            if (oldScript) oldScript.remove();

            const script = document.createElement('script');
            script.src = `pages/${pageName}/${pageName}.js`;
            script.id = 'page-script';

            // Execute init() after script loads
            script.onload = () => {
                // Convention: Module name matches Page name (PascalCase)
                // e.g. dashboard -> Dashboard, form -> Form
                const moduleName = pageName.charAt(0).toUpperCase() + pageName.slice(1);

                if (window[moduleName] && typeof window[moduleName].init === 'function') {
                    window[moduleName].init(param);
                }
            };
            document.body.appendChild(script);

        } catch (error) {
            console.error(error);
            const content = document.getElementById('app-content');
            if (content) content.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        } finally {
            Router.toggleLoading(false);
        }
    },

    /**
     * แสดง/ซ่อน Loading Spinner ระดับ Global
     * @param {boolean} show - true = แสดง, false = ซ่อน
     */
    toggleLoading: (show) => {
        const el = document.getElementById('loading');
        if (el) show ? el.classList.remove('d-none') : el.classList.add('d-none');
    }
};

/**
 * Authentication Helper
 */
const Auth = {
    // รหัสผ่านที่ใช้เข้าสู่ระบบ
    PASSWORD: "1160@OES",

    init: () => {
        const overlay = document.getElementById('loginOverlay');
        const isLogged = sessionStorage.getItem('IS_LOGGED_IN');

        if (isLogged === 'true') {
            // ซ่อนหน้าล็อกอิน ดึง dashboard ได้เลย
            if (overlay) overlay.classList.add('d-none');
            Router.load('dashboard');
        } else {
            // แสดงหน้าล็อกอิน
            if (overlay) overlay.classList.remove('d-none');
            const passInput = document.getElementById('loginPassword');
            if (passInput) passInput.focus();
        }
    },

    login: () => {
        const passInput = document.getElementById('loginPassword');
        const errorMsg = document.getElementById('loginError');
        const val = passInput ? passInput.value.trim() : '';

        if (val === Auth.PASSWORD) {
            sessionStorage.setItem('IS_LOGGED_IN', 'true');
            if (errorMsg) errorMsg.classList.add('d-none');

            // Animation ซ่อน Overlay
            const overlay = document.getElementById('loginOverlay');
            if (overlay) {
                overlay.style.transition = 'opacity 0.4s ease';
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.classList.add('d-none');
                    // โหลด dashboard เมื่อล๊อกอินสำเร็จ
                    Router.load('dashboard');
                }, 400);
            } else {
                Router.load('dashboard');
            }
        } else {
            // รหัสผิด
            if (errorMsg) errorMsg.classList.remove('d-none');
            if (passInput) {
                passInput.value = '';
                passInput.focus();

                // สั่นตักเตือน
                passInput.classList.add('is-invalid');
                setTimeout(() => passInput.classList.remove('is-invalid'), 600);
            }
        }
    }
};

// เริ่มตรวจสอบ Auth เมื่อทุกอย่างพร้อม
window.onload = () => Auth.init();