<?php
/**
 * Quran Tilawat Custom Theme Functions & API Backend
 */

// Define constants
define('QURAN_THEME_VERSION', '1.0.0');

/**
 * 1. Theme Setup and Asset Management
 */
function quran_theme_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    register_nav_menus(array(
        'primary' => __('Primary Menu', 'quran-tilawat'),
    ));
}
add_action('after_setup_theme', 'quran_theme_setup');

function quran_theme_enqueue_assets() {
    $theme_dir = get_template_directory();
    $theme_uri = get_template_directory_uri();

    // Dynamically scan the assets folder to locate hashed CSS and JS compiled by Vite
    $css_files = glob($theme_dir . '/assets/*.css');
    $js_files  = glob($theme_dir . '/assets/*.js');

    if (!empty($css_files)) {
        $css_file = basename($css_files[0]);
        wp_enqueue_style(
            'quran-theme-app-style',
            $theme_uri . '/assets/' . $css_file,
            array(),
            QURAN_THEME_VERSION
        );
    }

    if (!empty($js_files)) {
        $js_file = basename($js_files[0]);
        wp_enqueue_script(
            'quran-theme-app-script',
            $theme_uri . '/assets/' . $js_file,
            array(),
            QURAN_THEME_VERSION,
            true // Load in footer
        );
    }
}
add_action('wp_enqueue_scripts', 'quran_theme_enqueue_assets');

/**
 * 2. SPA Rewrite Rules for direct URL navigations
 */
function quran_theme_rewrite_rules() {
    add_rewrite_rule('^admin/?$', 'index.php', 'top');
    add_rewrite_rule('^page/([^/]+)/?$', 'index.php', 'top');
    add_rewrite_rule('^surah/(\d+)(/ayah/(\d+))?/?$', 'index.php', 'top');
}
add_action('init', 'quran_theme_rewrite_rules');

function quran_theme_activate() {
    quran_theme_rewrite_rules();
    flush_rewrite_rules();
    
    // Seed default custom pages from pages.json on theme activation
    $pages_option = get_option('quran_theme_pages');
    if ($pages_option === false) {
        $json_path = get_template_directory() . '/pages.json';
        if (file_exists($json_path)) {
            $default_pages = json_decode(file_get_contents($json_path), true);
            if (is_array($default_pages)) {
                update_option('quran_theme_pages', $default_pages);
            }
        }
    }

    // Generate a secure first-time setup code if not present
    if (get_option('quran_theme_setup_code') === false) {
        $setup_code = wp_generate_password(8, false);
        update_option('quran_theme_setup_code', $setup_code);
    }
}
add_action('after_switch_theme', 'quran_theme_activate');

function quran_theme_deactivate() {
    flush_rewrite_rules();
}
add_action('switch_theme', 'quran_theme_deactivate');


/**
 * 3. Settings Page in Admin Dashboard
 */
function quran_theme_add_settings_page() {
    add_options_page(
        'Al-Mualim Theme Settings',
        'Al-Mualim Settings',
        'manage_options',
        'quran-theme-settings',
        'quran_theme_render_settings_page'
    );
}
add_action('admin_menu', 'quran_theme_add_settings_page');

function quran_theme_render_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }

    // Save settings
    if (isset($_POST['quran_theme_save_settings']) && check_admin_referer('quran_theme_settings_verify')) {
        $gemini_key = sanitize_text_field($_POST['quran_theme_gemini_key']);
        update_option('quran_theme_gemini_key', $gemini_key);
        $websocket_url = esc_url_raw($_POST['quran_theme_websocket_url']);
        update_option('quran_theme_websocket_url', $websocket_url);
        echo '<div class="updated"><p>Settings saved successfully!</p></div>';
    }

    $gemini_key = get_option('quran_theme_gemini_key', '');
    $websocket_url = get_option('quran_theme_websocket_url', '');
    $setup_code = get_option('quran_theme_setup_code', '');
    $admins = get_option('quran_theme_admins', array());
    $has_admins = !empty($admins);
    ?>
    <div class="wrap">
        <h1>Al-Mualim Immersive Quran Theme Settings</h1>
        <form method="post" action="">
            <?php wp_nonce_field('quran_theme_settings_verify'); ?>
            <table class="form-table">
                <tr valign="top">
                    <th scope="row">Google Gemini API Key</th>
                    <td>
                        <input type="password" name="quran_theme_gemini_key" value="<?php echo esc_attr($gemini_key); ?>" class="regular-text" placeholder="AI Studio API Key" />
                        <p class="description">Get your API Key from the <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer">Google AI Studio</a>.</p>
                    </td>
                </tr>
                <tr valign="top">
                    <th scope="row">Gemini Live WebSocket URL</th>
                    <td>
                        <input type="text" name="quran_theme_websocket_url" value="<?php echo esc_attr($websocket_url); ?>" class="regular-text" placeholder="wss://your-node-companion.com/api/live-ws" style="width: 400px;" />
                        <p class="description">Optional. Specify the external WebSocket URL of the companion Node server (e.g., hosted on Render, Railway, or a VPS) to enable the real-time Voice Hotline recitation feature on Namecheap PHP hosting.</p>
                    </td>
                </tr>
                <tr valign="top">
                    <th scope="row">Theme Administration Status</th>
                    <td>
                        <?php if ($has_admins) : ?>
                            <span style="color: green; font-weight: bold;">✔ Active (Admins configured)</span>
                        <?php else : ?>
                            <span style="color: red; font-weight: bold;">⚠️ Pending Initial Setup</span>
                            <p class="description">No theme administrators are configured inside the application admin portal. Log in to the application's <strong>/admin</strong> dashboard page and create an administrative account using the setup code below:</p>
                            <div style="background: #fff; padding: 10px; border: 1px solid #ccc; font-family: monospace; display: inline-block; font-size: 14px; margin-top: 5px;">
                                <strong>Setup Code:</strong> <?php echo esc_html($setup_code); ?>
                            </div>
                        <?php endif; ?>
                    </td>
                </tr>
            </table>
            <p class="submit">
                <input type="submit" name="quran_theme_save_settings" class="button-primary" value="Save Settings" />
            </p>
        </form>
    </div>
    <?php
}

/**
 * 4. API Endpoints Dispatcher and Router
 */
function quran_theme_handle_api_requests() {
    $request_uri = $_SERVER['REQUEST_URI'];
    
    // Check if the path contains /api/
    if (!preg_match('/\/api\/([a-zA-Z0-9\/_-]+)/', $request_uri, $matches)) {
        return;
    }

    $api_path = $matches[1];
    $method = $_SERVER['REQUEST_METHOD'];

    // Set CORS headers
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');

    if ($method === 'OPTIONS') {
        exit;
    }

    // Process endpoints
    switch ($api_path) {
        case 'admin/status':
            quran_theme_api_admin_status();
            break;
        case 'admin/signup':
            quran_theme_api_admin_signup();
            break;
        case 'admin/login':
            quran_theme_api_admin_login();
            break;
        case 'admin/me':
            quran_theme_api_admin_me();
            break;
        case 'admin/update-profile':
            quran_theme_api_admin_update_profile();
            break;
        case 'pages':
            quran_theme_api_pages();
            break;
        case 'surah-pages':
            quran_theme_api_surah_pages();
            break;
        case 'rag/documents':
            quran_theme_api_rag_documents();
            break;
        case 'rag/toggle':
            quran_theme_api_rag_toggle();
            break;
        case 'rag/settings':
            quran_theme_api_rag_settings();
            break;
        case 'proxy-audio':
            quran_theme_api_proxy_audio();
            break;
        case 'bot/chat':
            quran_theme_api_bot_chat();
            break;
        case 'gemini/tts':
            quran_theme_api_gemini_tts();
            break;
        case 'ayah/seo':
            quran_theme_api_ayah_seo();
            break;
        default:
            // Check for path variables like /api/pages/:id or /api/surah-pages/:id
            if (preg_match('/^pages\/([a-zA-Z0-9-]+)$/', $api_path, $sub_matches)) {
                quran_theme_api_pages($sub_matches[1]);
            } elseif (preg_match('/^surah-pages\/([a-zA-Z0-9-]+)$/', $api_path, $sub_matches)) {
                quran_theme_api_surah_pages($sub_matches[1]);
            } elseif (preg_match('/^rag\/documents\/([a-zA-Z0-9-]+)$/', $api_path, $sub_matches)) {
                quran_theme_api_rag_documents($sub_matches[1]);
            } else {
                wp_send_json_error(array('error' => 'API endpoint not found: ' . $api_path), 404);
            }
            break;
    }
    exit;
}
add_action('init', 'quran_theme_handle_api_requests', 5);

/**
 * 5. Authentication Token Verification Helper
 */
function quran_theme_verify_token() {
    $headers = apache_request_headers();
    $auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    if (empty($auth_header) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
    }

    if (preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
        $token = trim($matches[1]);
        $sessions = get_option('quran_theme_active_sessions', array());
        
        if (isset($sessions[$token])) {
            $session = $sessions[$token];
            if ($session['expiresAt'] > time()) {
                // Slide expiration window
                $sessions[$token]['expiresAt'] = time() + (24 * 60 * 60);
                update_option('quran_theme_active_sessions', $sessions);
                return $session;
            }
        }
    }
    wp_send_json_error(array('error' => 'Unauthorized session. Please login inside the Admin Console.'), 401);
}

/**
 * 6. API Endpoint Handlers
 */

// GET /api/admin/status
function quran_theme_api_admin_status() {
    $admins = get_option('quran_theme_admins', array());
    wp_send_json(array('initialized' => !empty($admins)));
}

// POST /api/admin/signup
function quran_theme_api_admin_signup() {
    $body = json_decode(file_get_contents('php://input'), true);
    $username = isset($body['username']) ? sanitize_user($body['username']) : '';
    $email = isset($body['email']) ? sanitize_email($body['email']) : '';
    $password = isset($body['password']) ? $body['password'] : '';
    $setup_code = isset($body['setupCode']) ? trim($body['setupCode']) : '';

    $admins = get_option('quran_theme_admins', array());

    if (!empty($admins)) {
        // Only existing logged-in admins can invite other admins
        quran_theme_verify_token();
    } else {
        // First setup requires verification of the system setup code
        $saved_code = get_option('quran_theme_setup_code', '');
        if ($setup_code !== $saved_code) {
            wp_send_json_error(array('error' => 'Access denied: Invalid setup code. Check WordPress Admin dashboard settings.'), 403);
        }
    }

    if (empty($username) || empty($email) || empty($password)) {
        wp_send_json_error(array('error' => 'Username, email and password are required fields.'), 400);
    }

    if (strlen($password) < 8) {
        wp_send_json_error(array('error' => 'Passwords must consist of at least 8 characters.'), 400);
    }

    // Check collisions
    foreach ($admins as $admin) {
        if (strtolower($admin['username']) === strtolower($username)) {
            wp_send_json_error(array('error' => 'This username is already taken.'), 400);
        }
        if (strtolower($admin['email']) === strtolower($email)) {
            wp_send_json_error(array('error' => 'An administrator is already registered with this email.'), 400);
        }
    }

    // Create admin record
    $new_admin = array(
        'id' => 'admin-' . wp_generate_password(8, false),
        'username' => $username,
        'email' => $email,
        'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
        'created' => current_time('mysql')
    );

    $admins[] = $new_admin;
    update_option('quran_theme_admins', $admins);

    wp_send_json(array('success' => true, 'message' => 'Administrative profile registered successfully!'));
}

// POST /api/admin/login
function quran_theme_api_admin_login() {
    $body = json_decode(file_get_contents('php://input'), true);
    $username_or_email = isset($body['usernameOrEmail']) ? trim($body['usernameOrEmail']) : '';
    $password = isset($body['password']) ? $body['password'] : '';

    $admins = get_option('quran_theme_admins', array());
    $found_admin = null;

    foreach ($admins as $admin) {
        if (strtolower($admin['username']) === strtolower($username_or_email) || strtolower($admin['email']) === strtolower($username_or_email)) {
            if (password_verify($password, $admin['passwordHash'])) {
                $found_admin = $admin;
                break;
            }
        }
    }

    // Fallback: Support default admin credentials with system setup code on initial config if no admins exist
    if (!$found_admin && empty($admins) && strtolower($username_or_email) === 'admin') {
        $saved_code = get_option('quran_theme_setup_code', '');
        if ($password === $saved_code) {
            $found_admin = array('username' => 'admin', 'email' => 'admin@al-mualim.com');
        }
    }

    if (!$found_admin) {
        wp_send_json_error(array('error' => 'Error: Incorrect password or username. Please try again.'), 400);
    }

    // Generate session token
    $token = bin2hex(random_bytes(32));
    $sessions = get_option('quran_theme_active_sessions', array());
    
    $sessions[$token] = array(
        'username' => $found_admin['username'],
        'email' => $found_admin['email'],
        'expiresAt' => time() + (24 * 60 * 60) // 24 hours
    );
    update_option('quran_theme_active_sessions', $sessions);

    wp_send_json(array('token' => $token));
}

// GET /api/admin/me
function quran_theme_api_admin_me() {
    $session = quran_theme_verify_token();
    wp_send_json(array('username' => $session['username'], 'email' => $session['email']));
}

// POST /api/admin/update-profile
function quran_theme_api_admin_update_profile() {
    $session = quran_theme_verify_token();
    $body = json_decode(file_get_contents('php://input'), true);
    
    $new_username = isset($body['newUsername']) ? sanitize_user($body['newUsername']) : '';
    $new_email = isset($body['newEmail']) ? sanitize_email($body['newEmail']) : '';
    $current_password = isset($body['currentPassword']) ? $body['currentPassword'] : '';
    $new_password = isset($body['newPassword']) ? $body['newPassword'] : '';

    $admins = get_option('quran_theme_admins', array());
    $admin_idx = -1;

    for ($i = 0; $i < count($admins); $i++) {
        if (strtolower($admins[$i]['username']) === strtolower($session['username'])) {
            $admin_idx = $i;
            break;
        }
    }

    if ($admin_idx === -1) {
        wp_send_json_error(array('error' => 'Administrative profile not found in database.'), 404);
    }

    // Verify current password
    if (!password_verify($current_password, $admins[$admin_idx]['passwordHash'])) {
        wp_send_json_error(array('error' => 'Security check failed: Incorrect current password.'), 400);
    }

    if (!empty($new_username)) {
        $admins[$admin_idx]['username'] = $new_username;
        $session['username'] = $new_username;
    }

    if (!empty($new_email)) {
        $admins[$admin_idx]['email'] = $new_email;
        $session['email'] = $new_email;
    }

    if (!empty($new_password)) {
        if (strlen($new_password) < 8) {
            wp_send_json_error(array('error' => 'New passwords must consist of at least 8 characters.'), 400);
        }
        $admins[$admin_idx]['passwordHash'] = password_hash($new_password, PASSWORD_DEFAULT);
    }

    update_option('quran_theme_admins', $admins);

    // Sync session updates
    $headers = apache_request_headers();
    $auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    if (empty($auth_header) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
    }
    if (preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
        $token = trim($matches[1]);
        $sessions = get_option('quran_theme_active_sessions', array());
        if (isset($sessions[$token])) {
            $sessions[$token]['username'] = $session['username'];
            $sessions[$token]['email'] = $session['email'];
            update_option('quran_theme_active_sessions', $sessions);
        }
    }

    wp_send_json(array(
        'success' => true,
        'message' => 'Credentials updated securely in database!',
        'username' => $session['username'],
        'email' => $session['email']
    ));
}

// GET /api/pages, POST /api/pages, PUT /api/pages/:id, DELETE /api/pages/:id
function quran_theme_api_pages($id = null) {
    $method = $_SERVER['REQUEST_METHOD'];
    $pages = get_option('quran_theme_pages', array());

    if ($method === 'GET') {
        if ($id) {
            // Find by slug or id
            foreach ($pages as $p) {
                if ($p['id'] === $id || $p['slug'] === $id) {
                    wp_send_json($p);
                }
            }
            wp_send_json_error(array('error' => 'Page not found'), 404);
        }
        wp_send_json($pages);
    }

    // Write operations require admin auth
    quran_theme_verify_token();

    if ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true);
        $title = isset($body['title']) ? sanitize_text_field($body['title']) : '';
        $slug = isset($body['slug']) ? sanitize_title($body['slug']) : '';
        $content = isset($body['content']) ? wp_kses_post($body['content']) : '';
        $status = isset($body['status']) ? sanitize_text_field($body['status']) : 'draft';

        if (empty($title) || empty($slug)) {
            wp_send_json_error(array('error' => 'Title and slug are required.'), 400);
        }

        foreach ($pages as $p) {
            if ($p['slug'] === $slug) {
                wp_send_json_error(array('error' => 'A page with this URL slug already exists.'), 400);
            }
        }

        $new_page = array(
            'id' => 'pg-' . wp_generate_password(8, false),
            'title' => $title,
            'slug' => $slug,
            'content' => $content,
            'status' => $status,
            'seoTitle' => isset($body['seoTitle']) ? sanitize_text_field($body['seoTitle']) : $title,
            'seoDescription' => isset($body['seoDescription']) ? sanitize_text_field($body['seoDescription']) : '',
            'seoKeywords' => isset($body['seoKeywords']) ? sanitize_text_field($body['seoKeywords']) : '',
            'seoH1' => isset($body['seoH1']) ? sanitize_text_field($body['seoH1']) : $title,
            'seoRobots' => isset($body['seoRobots']) ? sanitize_text_field($body['seoRobots']) : 'index, follow',
            'sitemapPriority' => isset($body['sitemapPriority']) ? sanitize_text_field($body['sitemapPriority']) : '0.5',
            'created' => current_time('mysql'),
            'modified' => current_time('mysql')
        );

        $pages[] = $new_page;
        update_option('quran_theme_pages', $pages);
        wp_send_json($new_page, 201);
    }

    if ($method === 'PUT') {
        if (!$id) {
            wp_send_json_error(array('error' => 'Missing page ID'), 400);
        }

        $body = json_decode(file_get_contents('php://input'), true);
        $title = isset($body['title']) ? sanitize_text_field($body['title']) : '';
        $slug = isset($body['slug']) ? sanitize_title($body['slug']) : '';
        $content = isset($body['content']) ? wp_kses_post($body['content']) : '';
        $status = isset($body['status']) ? sanitize_text_field($body['status']) : 'draft';

        $found_idx = -1;
        for ($i = 0; $i < count($pages); $i++) {
            if ($pages[$i]['id'] === $id) {
                $found_idx = $i;
                break;
            }
        }

        if ($found_idx === -1) {
            wp_send_json_error(array('error' => 'Page not found'), 404);
        }

        // Check slug collision
        foreach ($pages as $p) {
            if ($p['slug'] === $slug && $p['id'] !== $id) {
                wp_send_json_error(array('error' => 'A page with this URL slug already exists.'), 400);
            }
        }

        $pages[$found_idx] = array_merge($pages[$found_idx], array(
            'title' => $title,
            'slug' => $slug,
            'content' => $content,
            'status' => $status,
            'seoTitle' => isset($body['seoTitle']) ? sanitize_text_field($body['seoTitle']) : $title,
            'seoDescription' => isset($body['seoDescription']) ? sanitize_text_field($body['seoDescription']) : '',
            'seoKeywords' => isset($body['seoKeywords']) ? sanitize_text_field($body['seoKeywords']) : '',
            'seoH1' => isset($body['seoH1']) ? sanitize_text_field($body['seoH1']) : $title,
            'seoRobots' => isset($body['seoRobots']) ? sanitize_text_field($body['seoRobots']) : 'index, follow',
            'sitemapPriority' => isset($body['sitemapPriority']) ? sanitize_text_field($body['sitemapPriority']) : '0.5',
            'modified' => current_time('mysql')
        ));

        update_option('quran_theme_pages', $pages);
        wp_send_json($pages[$found_idx]);
    }

    if ($method === 'DELETE') {
        if (!$id) {
            wp_send_json_error(array('error' => 'Missing page ID'), 400);
        }

        $filtered = array();
        $found = false;
        foreach ($pages as $p) {
            if ($p['id'] === $id) {
                $found = true;
            } else {
                $filtered[] = $p;
            }
        }

        if (!$found) {
            wp_send_json_error(array('error' => 'Page not found'), 404);
        }

        update_option('quran_theme_pages', $filtered);
        wp_send_json(array('success' => true));
    }
}

// GET /api/surah-pages, PUT /api/surah-pages/:id
function quran_theme_api_surah_pages($id = null) {
    $method = $_SERVER['REQUEST_METHOD'];
    $surah_pages = get_option('quran_theme_surah_pages', array());

    // Generate defaults on initial read if empty
    if (empty($surah_pages)) {
        $surah_names = array(
            "Al-Fatihah", "Al-Baqarah", "Ali 'Imran", "An-Nisa'", "Al-Ma'idah", "Al-An'am", 
            "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus", "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", 
            "Al-Hijr", "An-Nahl", "Al-Isra'", "Al-Kahf", "Maryam", "Ta-Ha", "Al-Anbya'", 
            "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Ash-Shu'ara'", "An-Naml", "Al-Qasas", 
            "Al-Ankabut", "Ar-Rum", "Luqman", "As-Sajdah", "Al-Ahzab", "Saba'", "Fatir", "Ya-Sin", 
            "As-Saffat", "Sad", "Az-Zumar", "Ghafir", "Fussilat", "Ash-Shura", "Az-Zukhruf", 
            "Ad-Dukhan", "Al-Jathiyah", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf", 
            "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", 
            "Al-Mujadilah", "Al-Hashr", "Al-Mumtahanah", "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", 
            "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij", "Nuh", "Al-Jinn", 
            "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba'", "An-Nazi'at", 
            "Abasa", "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj", "At-Tariq", 
            "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad", "Ash-Shams", "Al-Layl", "Ad-Duha", 
            "Ash-Sharh", "At-Tin", "Al-Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-Adiyat", 
            "Al-Qari'ah", "At-Takathur", "Al-Asr", "Al-Humazah", "Al-Fil", "Quraysh", "Al-Ma'un", 
            "Al-Kauthar", "Al-Kafirun", "An-Nasr", "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas"
        );

        foreach ($surah_names as $i => $name) {
            $num = $i + 1;
            $slug_name = sanitize_title($name);
            $surah_pages[] = array(
                'id' => "surah-page-{$num}",
                'surahNumber' => $num,
                'slug' => "surah-{$slug_name}",
                'title' => "Surah {$name} - Al-Mualim Scholar Gateway",
                'status' => 'published',
                'seoTitle' => "Surah {$name} (Chapter {$num}) - Translation & Tafsir",
                'seoDescription' => "Read and listen to Surah {$name} with classical Tafseer, translations, and interactive AI study companion.",
                'seoKeywords' => "surah {$slug_name}, quran chapter {$num}, tafsir, recitation",
                'seoH1' => "Surah {$name} (سورة)",
                'customIntro' => "Welcome to the customizable study page for **Surah {$name}**. This Surah contains beautiful lessons and spiritual guidelines. You can edit this page, override translations, tafsir, or audio in your admin control panel.",
                'customAudioUrl' => "",
                'translationOverrides' => (object) array(),
                'tafsirOverrides' => (object) array(),
                'modified' => current_time('mysql')
            );
        }
        update_option('quran_theme_surah_pages', $surah_pages);
    }

    if ($method === 'GET') {
        wp_send_json($surah_pages);
    }

    // Write operations require authentication
    quran_theme_verify_token();

    if ($method === 'PUT') {
        if (!$id) {
            wp_send_json_error(array('error' => 'Missing page ID'), 400);
        }

        $body = json_decode(file_get_contents('php://input'), true);

        $found_idx = -1;
        for ($i = 0; $i < count($surah_pages); $i++) {
            if ($surah_pages[$i]['id'] === $id) {
                $found_idx = $i;
                break;
            }
        }

        if ($found_idx === -1) {
            wp_send_json_error(array('error' => 'Surah page customization not found'), 404);
        }

        $surah_pages[$found_idx] = array_merge($surah_pages[$found_idx], array(
            'title' => sanitize_text_field($body['title']),
            'status' => sanitize_text_field($body['status']),
            'seoTitle' => sanitize_text_field($body['seoTitle']),
            'seoDescription' => sanitize_text_field($body['seoDescription']),
            'seoKeywords' => sanitize_text_field($body['seoKeywords']),
            'seoH1' => sanitize_text_field($body['seoH1']),
            'customIntro' => wp_kses_post($body['customIntro']),
            'customAudioUrl' => esc_url_raw($body['customAudioUrl']),
            'translationOverrides' => isset($body['translationOverrides']) ? $body['translationOverrides'] : (object) array(),
            'tafsirOverrides' => isset($body['tafsirOverrides']) ? $body['tafsirOverrides'] : (object) array(),
            'modified' => current_time('mysql')
        ));

        update_option('quran_theme_surah_pages', $surah_pages);
        wp_send_json($surah_pages[$found_idx]);
    }
}

// GET /api/rag/documents, POST /api/rag/documents, DELETE /api/rag/documents/:id
function quran_theme_api_rag_documents($id = null) {
    $method = $_SERVER['REQUEST_METHOD'];
    $custom_docs = get_option('quran_theme_rag_docs', array());

    // Preloaded docs list
    $preloaded = array(
        array(
            'id' => 'pre-niyyah',
            'title' => 'Sincerity, Intentions, and Sincerity of Action (Niyyah)',
            'category' => 'hadith',
            'source' => 'Sahih al-Bukhari & Sahih Muslim',
            'isActive' => true,
            'isPreloaded' => true,
            'content' => "Narrated by Umar bin Al-Khattab, the Messenger of Allah, peace be upon him, said: \"Actions are but by intentions and every man shall have only that which he intended...\""
        ),
        array(
            'id' => 'pre-ikhlas',
            'title' => 'Tafseer of Surah Al-Ikhlas (Absolute Monotheism)',
            'category' => 'tafsir',
            'source' => 'Tafsir Ibn Kathir - Chapter 112',
            'isActive' => true,
            'isPreloaded' => true,
            'content' => "Surah Al-Ikhlas (Chapter 112) is equivalent to one-third of the Quran. Ibn Kathir explains..."
        ),
        array(
            'id' => 'pre-ilm',
            'title' => 'The Virtues of Seeking and Spreading Sacred Knowledge (Al-Ilm)',
            'category' => 'hadith',
            'source' => 'Sahih Muslim & Sunan Ibn Majah',
            'isActive' => true,
            'isPreloaded' => true,
            'content' => "The Prophet Muhammad (peace be upon him) said: \"Whoever takes a path in search of knowledge, Allah will make easy for him the path to Paradise...\""
        ),
        array(
            'id' => 'pre-sabr-salah',
            'title' => 'The Value of Patience, Struggle and Prayer (Sabr & Salah)',
            'category' => 'tafsir',
            'source' => 'Tafsir al-Jalalayn & Maariful Quran - Al-Baqarah',
            'isActive' => true,
            'isPreloaded' => true,
            'content' => "Allah the Almighty says in Surah Al-Baqarah (2:153): \"O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient.\""
        ),
        array(
            'id' => 'pre-khuluq',
            'title' => 'Good Character, Manners, and Interpersonal Ethics (Husn al-Khuluq)',
            'category' => 'hadith',
            'source' => 'Jami\' at-Tirmidhi & Riyadh us-Saliheen',
            'isActive' => true,
            'isPreloaded' => true,
            'content' => "The Messenger of Allah, peace be upon him, said: \"Nothing is heavier on the Scale of the believer on the Day of Resurrection than good character...\""
        ),
        array(
            'id' => 'pre-wahy',
            'title' => 'The Process of Revelation & Asbab al-Nuzul (History of Wahy)',
            'category' => 'history',
            'source' => 'Sahih al-Bukhari & Al-Suyuti\'s Itqan',
            'isActive' => true,
            'isPreloaded' => true,
            'content' => "Wahy (Divine Revelation) began in the Cave of Hira in the Year 610 CE..."
        ),
        array(
            'id' => 'pre-parents',
            'title' => 'Honoring, Serving, and Loving Parents (Birr al-Walidayn)',
            'category' => 'tafsir',
            'source' => 'Maariful Quran & Ibn Kathir - Surah Al-Isra',
            'isActive' => true,
            'isPreloaded' => true,
            'content' => "Allah says in Surah Al-Isra (17:23-24): \"And your Lord has decreed that you not worship except Him, and to parents, good treatment...\""
        )
    );

    if ($method === 'GET') {
        // Apply overrides from custom docs to preloaded items
        $combined = array();
        foreach ($preloaded as $pDoc) {
            $override_active = true;
            foreach ($custom_docs as $cDoc) {
                if ($cDoc['id'] === $pDoc['id']) {
                    $override_active = isset($cDoc['isActive']) ? $cDoc['isActive'] : true;
                    break;
                }
            }
            $pDoc['isActive'] = $override_active;
            $combined[] = $pDoc;
        }

        // Add user documents
        foreach ($custom_docs as $cDoc) {
            // Exclude override items from custom_docs
            $is_preloaded = false;
            foreach ($preloaded as $pDoc) {
                if ($pDoc['id'] === $cDoc['id']) {
                    $is_preloaded = true;
                    break;
                }
            }
            if (!$is_preloaded) {
                $cDoc['isPreloaded'] = false;
                $combined[] = $cDoc;
            }
        }

        wp_send_json($combined);
    }

    quran_theme_verify_token();

    if ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true);
        $title = isset($body['title']) ? sanitize_text_field($body['title']) : '';
        $source = isset($body['source']) ? sanitize_text_field($body['source']) : '';
        $category = isset($body['category']) ? sanitize_text_field($body['category']) : 'user-upload';
        $content = isset($body['content']) ? wp_kses_post($body['content']) : '';

        if (empty($title) || empty($content) || empty($source)) {
            wp_send_json_error(array('error' => 'Title, source, and text content are required.'), 400);
        }

        $new_doc = array(
            'id' => 'doc-' . wp_generate_password(8, false),
            'title' => $title,
            'source' => $source,
            'category' => $category,
            'content' => $content,
            'isActive' => true,
            'created' => current_time('mysql')
        );

        $custom_docs[] = $new_doc;
        update_option('quran_theme_rag_docs', $custom_docs);
        wp_send_json($new_doc, 201);
    }

    if ($method === 'DELETE') {
        if (!$id) {
            wp_send_json_error(array('error' => 'Missing document ID'), 400);
        }

        $filtered = array();
        $found = false;
        foreach ($custom_docs as $d) {
            if ($d['id'] === $id) {
                $found = true;
            } else {
                $filtered[] = $d;
            }
        }

        if (!$found) {
            wp_send_json_error(array('error' => 'Document not found.'), 404);
        }

        update_option('quran_theme_rag_docs', $filtered);
        wp_send_json(array('success' => true));
    }
}

// POST /api/rag/toggle
function quran_theme_api_rag_toggle() {
    quran_theme_verify_token();
    $body = json_decode(file_get_contents('php://input'), true);
    $id = isset($body['id']) ? sanitize_text_field($body['id']) : '';
    $is_active = isset($body['isActive']) ? (bool) $body['isActive'] : true;

    if (empty($id)) {
        wp_send_json_error(array('error' => 'Document ID is required.'), 400);
    }

    $custom_docs = get_option('quran_theme_rag_docs', array());
    $found_idx = -1;

    for ($i = 0; $i < count($custom_docs); $i++) {
        if ($custom_docs[$i]['id'] === $id) {
            $found_idx = $i;
            break;
        }
    }

    if ($found_idx !== -1) {
        $custom_docs[$found_idx]['isActive'] = $is_active;
        update_option('quran_theme_rag_docs', $custom_docs);
        wp_send_json($custom_docs[$found_idx]);
    }

    // If preloaded toggle override, create custom overriding item record
    $preloaded_ids = array('pre-niyyah', 'pre-ikhlas', 'pre-ilm', 'pre-sabr-salah', 'pre-khuluq', 'pre-wahy', 'pre-parents');
    if (in_array($id, $preloaded_ids)) {
        $new_override = array(
            'id' => $id,
            'isActive' => $is_active
        );
        $custom_docs[] = $new_override;
        update_option('quran_theme_rag_docs', $custom_docs);
        wp_send_json($new_override);
    }

    wp_send_json_error(array('error' => 'Document not found.'), 404);
}

// GET /api/rag/settings, POST /api/rag/settings
function quran_theme_api_rag_settings() {
    $method = $_SERVER['REQUEST_METHOD'];
    $settings = get_option('quran_theme_rag_settings', array('ragEnabled' => true));

    if ($method === 'GET') {
        wp_send_json($settings);
    }

    quran_theme_verify_token();

    if ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true);
        $rag_enabled = isset($body['ragEnabled']) ? (bool) $body['ragEnabled'] : true;
        
        $settings['ragEnabled'] = $rag_enabled;
        update_option('quran_theme_rag_settings', $settings);
        wp_send_json(array('success' => true, 'ragEnabled' => $rag_enabled));
    }
}

// GET /api/proxy-audio (Proxy bypass for CORS)
function quran_theme_api_proxy_audio() {
    $url = isset($_GET['url']) ? esc_url_raw($_GET['url']) : '';
    if (empty($url)) {
        wp_send_json_error(array('error' => 'Missing audio URL parameter.'), 400);
    }

    $parsed_url = parse_url($url);
    $host = isset($parsed_url['host']) ? $parsed_url['host'] : '';

    $allowed_hosts = array(
        'cdn.islamic.network',
        'audio.qurancdn.com',
        'audio.quran.com',
        'everyayah.com'
    );

    if (!in_array($host, $allowed_hosts)) {
        wp_send_json_error(array('error' => 'Requested URL host is not whitelisted.'), 403);
    }

    // Call using WordPress HTTP API
    $response = wp_remote_get($url, array(
        'timeout'     => 15,
        'redirection' => 5,
        'user-agent'  => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Al-Mualim WP Downloader'
    ));

    if (is_wp_error($response)) {
        wp_send_json_error(array('error' => 'Audio download failed: ' . $response->get_error_message()), 502);
    }

    $content_type = wp_remote_retrieve_header($response, 'content-type');
    $content_length = wp_remote_retrieve_header($response, 'content-length');
    $body = wp_remote_retrieve_body($response);

    header('Content-Type: ' . (!empty($content_type) ? $content_type : 'audio/mpeg'));
    header('Access-Control-Allow-Origin: *');
    header('Cache-Control: public, max-age=31536000, immutable');
    if (!empty($content_length)) {
        header('Content-Length: ' . $content_length);
    }
    
    echo $body;
    exit;
}

/**
 * 7. TF-IDF Scholar RAG Keyword Search Helpers (mimicking Javascript ragEngine)
 */
function quran_theme_tokenize($text) {
    $text = strtolower($text);
    $text = preg_replace('/[.,\/#!$%\^&\*;:{}=\-_`~()?"\'🗣️📖📜💡]/u', '', $text);
    $tokens = preg_split('/\s+/', $text);
    $filtered = array();
    foreach ($tokens as $token) {
        if (strlen($token) > 2) {
            $filtered[] = $token;
        }
    }
    return $filtered;
}

function quran_theme_chunk_content($content) {
    $words = preg_split('/\s+/', trim($content));
    $words = array_filter($words, function($w) { return strlen(trim($w)) > 0; });
    $words = array_values($words);
    $chunks = array();
    
    $max_words = 150;
    $overlap_words = 30;

    if (count($words) <= $max_words) {
        return array($content);
    }

    $start = 0;
    while ($start < count($words)) {
        $slice = array_slice($words, $start, $max_words);
        if (empty($slice)) break;
        $chunks[] = implode(' ', $slice);
        $start += ($max_words - $overlap_words);
    }
    return $chunks;
}

function quran_theme_search_rag($query, $docs) {
    $stop_words = array("the", "and", "for", "with", "that", "this", "from", "you", "not", "but", "are", "have");
    $query_tokens = array_diff(quran_theme_tokenize($query), $stop_words);
    $clean_query = trim(strtolower($query));
    
    $all_chunks = array();
    foreach ($docs as $doc) {
        if (empty($doc['isActive'])) continue;
        $doc_chunks = quran_theme_chunk_content($doc['content']);
        foreach ($doc_chunks as $i => $text) {
            $all_chunks[] = array(
                'docId' => $doc['id'],
                'docTitle' => $doc['title'],
                'source' => $doc['source'],
                'category' => $doc['category'],
                'text' => $text
            );
        }
    }

    if (empty($all_chunks)) return array();

    // 1. Calculate document frequency
    $doc_freq = array();
    foreach ($query_tokens as $token) {
        $doc_freq[$token] = 0;
        foreach ($all_chunks as $chunk) {
            if (strpos(strtolower($chunk['text']), $token) !== false) {
                $doc_freq[$token]++;
            }
        }
    }

    $results = array();
    foreach ($all_chunks as $chunk) {
        $score = 0.0;
        $chunk_text_lower = strtolower($chunk['text']);
        $chunk_title_lower = strtolower($chunk['docTitle']);
        $chunk_source_lower = strtolower($chunk['source']);

        if (strpos($chunk_text_lower, $clean_query) !== false) {
            $score += 30.0;
        }

        foreach ($query_tokens as $token) {
            $freq = $doc_freq[$token];
            $idf = log(1 + (count($all_chunks) - $freq + 0.5) / ($freq + 0.5)) + 1;
            
            // Term occurrences
            $tf = substr_count($chunk_text_lower, $token);
            if ($tf > 0) {
                $score += $tf * $idf * 2.5;
                if (strpos($chunk_title_lower, $token) !== false) {
                    $score += $idf * 8.0;
                }
                if (strpos($chunk_source_lower, $token) !== false) {
                    $score += $idf * 4.0;
                }
            }
        }

        if ($score > 0.5) {
            $results[] = array(
                'chunk' => array(
                    'documentTitle' => $chunk['docTitle'],
                    'source' => $chunk['source'],
                    'category' => $chunk['category'],
                    'text' => $chunk['text']
                ),
                'score' => $score
            );
        }
    }

    usort($results, function($a, $b) {
        return $b['score'] <=> $a['score'];
    });

    return $results;
}

// POST /api/bot/chat (Gemini AI scholar bot integration)
function quran_theme_api_bot_chat() {
    $body = json_decode(file_get_contents('php://input'), true);
    $message = isset($body['message']) ? trim($body['message']) : '';
    $history = isset($body['history']) ? $body['history'] : array();
    $context = isset($body['context']) ? $body['context'] : null;
    $language = isset($body['language']) ? $body['language'] : 'English';

    if (empty($message)) {
        wp_send_json_error(array('error' => 'Message is required.'), 400);
    }

    $api_key = get_option('quran_theme_gemini_key', '');
    if (empty($api_key)) {
        $api_key = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : '';
    }

    if (empty($api_key)) {
        wp_send_json_error(array(
            'error' => 'Google Gemini API Key is missing. Please configure it in WordPress Settings > Al-Mualim Settings.',
            'isConfigError' => true
        ), 500);
    }

    $rag_settings = get_option('quran_theme_rag_settings', array('ragEnabled' => true));
    $top_results = array();

    if (!empty($rag_settings['ragEnabled'])) {
        // Read combined documents
        $custom_docs = get_option('quran_theme_rag_docs', array());
        $preloaded_raw = array(
            array('id' => 'pre-niyyah', 'title' => 'Sincerity, Intentions, and Sincerity of Action (Niyyah)', 'category' => 'hadith', 'source' => 'Sahih al-Bukhari & Sahih Muslim', 'isActive' => true, 'content' => "Narrated by Umar bin Al-Khattab, the Messenger of Allah..."),
            array('id' => 'pre-ikhlas', 'title' => 'Tafseer of Surah Al-Ikhlas (Absolute Monotheism)', 'category' => 'tafsir', 'source' => 'Tafsir Ibn Kathir - Chapter 112', 'isActive' => true, 'content' => "Surah Al-Ikhlas (Chapter 112) is equivalent..."),
            array('id' => 'pre-ilm', 'title' => 'The Virtues of Seeking and Spreading Sacred Knowledge (Al-Ilm)', 'category' => 'hadith', 'source' => 'Sahih Muslim & Sunan Ibn Majah', 'isActive' => true, 'content' => "The Prophet Muhammad said: \"Whoever takes a path...\""),
            array('id' => 'pre-sabr-salah', 'title' => 'The Value of Patience, Struggle and Prayer (Sabr & Salah)', 'category' => 'tafsir', 'source' => 'Tafsir al-Jalalayn & Maariful Quran - Al-Baqarah', 'isActive' => true, 'content' => "Allah the Almighty says in Surah Al-Baqarah (2:153)..."),
            array('id' => 'pre-khuluq', 'title' => 'Good Character, Manners, and Interpersonal Ethics (Husn al-Khuluq)', 'category' => 'hadith', 'source' => 'Jami\' at-Tirmidhi & Riyadh us-Saliheen', 'isActive' => true, 'content' => "The Messenger of Allah, peace be upon him, said: \"Nothing is heavier...\""),
            array('id' => 'pre-wahy', 'title' => 'The Process of Revelation & Asbab al-Nuzul (History of Wahy)', 'category' => 'history', 'source' => 'Sahih al-Bukhari & Al-Suyuti\'s Itqan', 'isActive' => true, 'content' => "Wahy (Divine Revelation) began in the Cave of Hira..."),
            array('id' => 'pre-parents', 'title' => 'Honoring, Serving, and Loving Parents (Birr al-Walidayn)', 'category' => 'tafsir', 'source' => 'Maariful Quran & Ibn Kathir - Surah Al-Isra', 'isActive' => true, 'content' => "Allah says in Surah Al-Isra (17:23-24)...")
        );

        $docs = array();
        foreach ($preloaded_raw as $pDoc) {
            $override_active = true;
            foreach ($custom_docs as $cDoc) {
                if ($cDoc['id'] === $pDoc['id']) {
                    $override_active = isset($cDoc['isActive']) ? $cDoc['isActive'] : true;
                    break;
                }
            }
            $pDoc['isActive'] = $override_active;
            $docs[] = $pDoc;
        }

        foreach ($custom_docs as $cDoc) {
            $is_preloaded = false;
            foreach ($preloaded_raw as $p) {
                if ($p['id'] === $cDoc['id']) { $is_preloaded = true; break; }
            }
            if (!$is_preloaded) {
                $docs[] = $cDoc;
            }
        }

        $search_results = quran_theme_search_rag($message, $docs);
        $top_results = array_slice($search_results, 0, 3);
    }

    $prompt = $message;
    if (!empty($top_results)) {
        $rag_context = "Verified baseline reference context retrieved from the Islamic Scholarly Library (RAG):\n\n";
        foreach ($top_results as $res) {
            $rag_context .= "[SOURCE REFERENCE]: " . $res['chunk']['source'] . " - \"" . $res['chunk']['documentTitle'] . "\" (Match Score: " . round($res['score']) . ")\n";
            $rag_context .= "[SCHOLARLY SNIPPET]:\n\"" . $res['chunk']['text'] . "\"\n\n";
        }
        $rag_context .= "----\nINSTRUCTION: Synthesize and weave this reference content elegantly into your response. If you extract rulings, Hadiths, or exegesis directly from these snippets, cite and highlight the works (e.g. Sahih al-Bukhari, Ibn Kathir) directly in bold. Respond like a profound, respectful Islamic scholar.\n\n";
        
        if ($context) {
            $prompt = "CONTEXT OF CURRENT SURAH/AYAH:\n" . json_encode($context) . "\n\n" . $rag_context . "USER QUESTION:\n" . $message;
        } else {
            $prompt = $rag_context . "USER QUESTION:\n" . $message;
        }
    } elseif ($context) {
        $prompt = "CONTEXT OF CURRENT AYAH/SURAH:\n" . json_encode($context) . "\n\nUSER QUESTION:\n" . $message;
    }

    // Build chat contents payload for Gemini REST API
    $contents = array();
    if (is_array($history)) {
        foreach ($history as $turn) {
            if (!empty($turn['role']) && !empty($turn['text'])) {
                $contents[] = array(
                    'role' => $turn['role'] === 'user' ? 'user' : 'model',
                    'parts' => array(
                        array('text' => $turn['text'])
                    )
                );
            }
        }
    }
    $contents[] = array(
        'role' => 'user',
        'parts' => array(
            array('text' => $prompt)
        )
    );

    // Setup system instructions
    $system_instruction = "You are 'Al-Mualim', an intelligent, compassionate, and highly authoritative Islamic Quran AI scholar and guide. Your purpose is to provide authentic, highly-accurate, and deeply moving explanations, Tafseer, and background (Asbab al-Nuzul) for any Quranic Ayat, and answer questions according to the correct traditional rulings of Islam and Quran.

Guidelines for your behavior:
1. Ground your answers strictly in the Holy Quran, authentic Hadith (specifically Sahih al-Bukhari, Sahih Muslim, etc.), and classical respected Tafseer scholars (such as Tafsir Ibn Kathir, Tafsir al-Jalalayn, and Maariful Quran).
2. When answering user queries, always maintain a respectful, inspiring, humble, and polite tone. Avoid modern slang, and always begin or end with beautiful, encouraging wisdom.
3. If an Ayat is provided as context, explain its historical context/revelation context, linguistic subtleties, theological meaning, and practical lessons a modern believer can apply.
4. Use clear, elegant Markdown layout:
   - Use beautiful headers (###) to separate parts.
   - Use bullet points for takeaways or moral lessons.
   - Use codeblocks or blockquotes (>) to format beautiful Arabic Quranic text and English translation verses nicely.
5. If a question is about complex Islamic jurisprudence, present the main views of the established schools of thought (fiqh) with absolute respect and focus on consensus (ijma).
6. Always avoid declaring things off-hand without sound classical backing, and state 'And Allah knows best' (Wa Allahu A'lam) at the end of answers as is traditional in Islamic scholarly dialogue.";

    if (strtolower($language) !== 'english') {
        $system_instruction .= "\n\nCRITICAL MANDATE: You MUST formulate, write, and present your entire response strictly in the {$language} language. Translate all explanations, morals, moral lessons, and scholarly commentaries into {$language} so the user can easily understand you. You may still display beautiful original Arabic verses in blockquotes or code blocks alongside their {$language} translation.";
    }

    // Call Gemini API using wp_remote_post
    $model = 'gemini-3.5-flash';
    $api_url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . rawurlencode($api_key);
    
    $payload = array(
        'contents' => $contents,
        'systemInstruction' => array(
            'parts' => array(
                array('text' => $system_instruction)
            )
        ),
        'generationConfig' => array(
            'temperature' => 0.7
        )
    );

    $response = wp_remote_post($api_url, array(
        'timeout' => 30,
        'headers' => array(
            'Content-Type' => 'application/json'
        ),
        'body' => json_encode($payload)
    ));

    if (is_wp_error($response)) {
        wp_send_json_error(array('error' => 'Gemini API call failed: ' . $response->get_error_message()), 502);
    }

    $response_body = json_decode(wp_remote_retrieve_body($response), true);
    $reply_text = isset($response_body['candidates'][0]['content']['parts'][0]['text']) ? $response_body['candidates'][0]['content']['parts'][0]['text'] : 'I was unable to formulate a response at this moment. Please ask again.';

    wp_send_json(array(
        'reply' => $reply_text,
        'citations' => array_map(function($r) {
            return array(
                'title' => $r['chunk']['documentTitle'],
                'source' => $r['chunk']['source'],
                'category' => $r['chunk']['category'],
                'text' => $r['chunk']['text'],
                'score' => round(min(100, $r['score'] * 1.5))
            );
        }, $top_results)
    ));
}

// POST /api/gemini/tts (Gemini Text-to-Speech API integration)
function quran_theme_api_gemini_tts() {
    $body = json_decode(file_get_contents('php://input'), true);
    $text = isset($body['text']) ? trim($body['text']) : '';

    if (empty($text)) {
        wp_send_json_error(array('error' => 'Text is required for speech synthesis.'), 400);
    }

    $api_key = get_option('quran_theme_gemini_key', '');
    if (empty($api_key)) {
        $api_key = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : '';
    }

    if (empty($api_key)) {
        wp_send_json_error(array('error' => 'Gemini API Key is missing. Settings configuration required.'), 500);
    }

    $api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=" . rawurlencode($api_key);
    
    $payload = array(
        'contents' => array(
            array(
                'parts' => array(
                    array('text' => $text)
                )
            )
        ),
        'generationConfig' => array(
            'responseModalities' => array('AUDIO'),
            'speechConfig' => array(
                'voiceConfig' => array(
                    'prebuiltVoiceConfig' => array(
                        'voiceName' => 'Zephyr'
                    )
                )
            )
        )
    );

    $response = wp_remote_post($api_url, array(
        'timeout' => 20,
        'headers' => array(
            'Content-Type' => 'application/json'
        ),
        'body' => json_encode($payload)
    ));

    if (is_wp_error($response)) {
        wp_send_json_error(array('error' => 'Gemini TTS request failed: ' . $response->get_error_message()), 502);
    }

    $response_body = json_decode(wp_remote_retrieve_body($response), true);
    $base64_audio = isset($response_body['candidates'][0]['content']['parts'][0]['inlineData']['data']) 
        ? $response_body['candidates'][0]['content']['parts'][0]['inlineData']['data'] 
        : '';

    if (empty($base64_audio)) {
        wp_send_json_error(array('error' => 'No inline audio data returned from Gemini TTS.'), 500);
    }

    wp_send_json(array('audio' => $base64_audio));
}

// POST /api/ayah/seo (Generate and cache SEO configurations)
function quran_theme_api_ayah_seo() {
    $body = json_decode(file_get_contents('php://input'), true);
    $surah_num = isset($body['surahNumber']) ? intval($body['surahNumber']) : 0;
    $ayah_num = isset($body['ayahNumber']) ? intval($body['ayahNumber']) : 0;
    $arabic = isset($body['arabicText']) ? trim($body['arabicText']) : '';
    $translation = isset($body['englishTranslation']) ? trim($body['englishTranslation']) : '';
    $surah_eng_name = isset($body['surahEnglishName']) ? trim($body['surahEnglishName']) : "Surah {$surah_num}";
    $total_ayahs = isset($body['totalAyahs']) ? intval($body['totalAyahs']) : 7;

    if ($surah_num === 0 || $ayah_num === 0) {
        wp_send_json_error(array('error' => 'surahNumber and ayahNumber parameters are required.'), 400);
    }

    $cache_option_key = "quran_seo_cache_{$surah_num}_{$ayah_num}";
    $cached_data = get_transient($cache_option_key);

    if ($cached_data !== false) {
        wp_send_json($cached_data);
    }

    // Build SEO fallbacks
    $title = "Surah {$surah_eng_name} Verse {$ayah_num} (Quran {$surah_num}:{$ayah_num}) - Meaning & Tafsir";
    $meta_desc = "Read Surah {$surah_eng_name} Ayat {$ayah_num} of the Noble Quran in Arabic with transliteration, English translations, and authoritative Tafsir references.";
    $slug = "surah-" . sanitize_title($surah_eng_name) . "-ayat-{$ayah_num}-meaning-tafsir";
    $h1 = "Surah {$surah_eng_name} Ayah {$ayah_num} Meaning & Tafsir";

    $next_ayah = $ayah_num < $total_ayahs ? $ayah_num + 1 : 1;
    $next_surah = $ayah_num < $total_ayahs ? $surah_num : ($surah_num < 114 ? $surah_num + 1 : 1);
    $prev_ayah = $ayah_num > 1 ? $ayah_num - 1 : 1;

    $yusuf_ali = trim(str_replace(
        array('you', 'your', 'You', 'Your'),
        array('thou', 'thy', 'Thee', 'Thy'),
        $translation
    ));

    $pickthall = trim(str_replace(
        'the Entirely Merciful, the Especially Merciful',
        'the Beneficent, the Merciful',
        $translation
    ));

    $seo_data = array(
        'title' => $title,
        'metaDescription' => $meta_desc,
        'slug' => $slug,
        'h1' => $h1,
        'keywords' => array(
            "Quran {$surah_num}:{$ayah_num}",
            "Surah {$surah_eng_name} Ayah {$ayah_num} meaning",
            "Surah {$surah_num} Verse {$ayah_num} tafsir",
            "Noble Quran English translation",
            "authentic Islamic sources"
        ),
        'arabic' => $arabic,
        'transliteration' => "Reading of Surah {$surah_eng_name} Verse {$ayah_num} in phonetic transliteration text.",
        'translations' => array(
            'sahih_international' => $translation,
            'yusuf_ali' => $yusuf_ali,
            'pickthall' => $pickthall,
            'comparison_summary' => "Comparing translation interfaces, Yusuf Ali highlights active spiritual motion and emotional resonance, Pickthall preserves a traditional majestic English format, and Sahih International translates closely to the literal Arabic word-frame."
        ),
        'summary' => "Ayah {$ayah_num} of Surah {$surah_eng_name} teaches profound Islamic principles. It forms a key part of this chapter, guiding believers on righteousness and authentic living.",
        'tafsir' => "According to the consensus classical interpretations (such as Tafsir Ibn Kathir, Safwat al-Tafasir, and Maariful Quran), this verse guides the believers on key elements of spiritual growth, devotion, and alignment with divine revelation.\n\nHistorically, this Surah provides foundational lessons in the development of the early Muslim community.",
        'relatedVerses' => array(
            array('surah' => (string) $surah_num, 'ayah' => (string) $prev_ayah, 'context' => "The preceding theological setup in Surah {$surah_eng_name} establishing core thematic foundations."),
            array('surah' => (string) $next_surah, 'ayah' => (string) $next_ayah, 'context' => "Succeeding theological continuity offering spiritual lessons.")
        ),
        'relatedTopics' => array("Quran Recitation", "Patience", "Spiritual Excellence", "Faith & Trust", "Scholarly Consensus"),
        'faqs' => array(
            array('question' => "What is the message of Surah {$surah_eng_name} Ayah {$ayah_num}?", 'answer' => "The core message is: \"{$translation}\". Local consensus indicates it highlights a crucial pillar of spiritual mindfulness, worship, and right action."),
            array('question' => "Which authentic sources explain Quran {$surah_num}:{$ayah_num}?", 'answer' => "Traditional sources include classical tafsirs of Ibn Kathir, Safwat al-Tafasir, and Maariful Quran.")
        ),
        'schema' => array(
            'articleSchema' => array(
                '@context' => 'https://schema.org',
                '@type' => 'Article',
                'headline' => $title,
                'description' => $meta_desc
            )
        )
    );

    // Cache results for 7 days
    set_transient($cache_option_key, $seo_data, 7 * 24 * 60 * 60);

    wp_send_json($seo_data);
}
