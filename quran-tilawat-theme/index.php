<?php
/**
 * The main template file
 */

get_header();
?>

<!-- React Mounting Element -->
<div id="root">
    <?php
    // SEO Pre-rendering for search engine crawlers (and noscript users)
    $request_uri = $_SERVER['REQUEST_URI'];
    
    // Parse subdirectory installs
    $home_path = parse_url(home_url(), PHP_URL_PATH);
    if ($home_path && $home_path !== '/') {
        $relative_uri = str_replace($home_path, '', $request_uri);
    } else {
        $relative_uri = $request_uri;
    }
    $relative_uri = '/' . ltrim($relative_uri, '/');

    // Surah Names Array
    $surah_names = array(
        1 => "Al-Fatihah", 2 => "Al-Baqarah", 3 => "Ali 'Imran", 4 => "An-Nisa'", 5 => "Al-Ma'idah", 6 => "Al-An'am", 
        7 => "Al-A'raf", 8 => "Al-Anfal", 9 => "At-Tawbah", 10 => "Yunus", 11 => "Hud", 12 => "Yusuf", 13 => "Ar-Ra'd", 14 => "Ibrahim", 
        15 => "Al-Hijr", 16 => "An-Nahl", 17 => "Al-Isra'", 18 => "Al-Kahf", 19 => "Maryam", 20 => "Ta-Ha", 21 => "Al-Anbya'", 
        22 => "Al-Hajj", 23 => "Al-Mu'minun", 24 => "An-Nur", 25 => "Al-Furqan", 26 => "Ash-Shu'ara'", 27 => "An-Naml", 28 => "Al-Qasas", 
        29 => "Al-Ankabut", 30 => "Ar-Rum", 31 => "Luqman", 32 => "As-Sajdah", 33 => "Al-Ahzab", 34 => "Saba'", 35 => "Fatir", 36 => "Ya-Sin", 
        37 => "As-Saffat", 38 => "Sad", 39 => "Az-Zumar", 40 => "Ghafir", 41 => "Fussilat", 42 => "Ash-Shura", 43 => "Az-Zukhruf", 
        44 => "Ad-Dukhan", 45 => "Al-Jathiyah", 46 => "Al-Ahqaf", 47 => "Muhammad", 48 => "Al-Fath", 49 => "Al-Hujurat", 50 => "Qaf", 
        51 => "Adh-Dhariyat", 52 => "At-Tur", 53 => "An-Najm", 54 => "Al-Qamar", 55 => "Ar-Rahman", 56 => "Al-Waqi'ah", 57 => "Al-Hadid", 
        58 => "Al-Mujadilah", 59 => "Al-Hashr", 60 => "Al-Mumtahanah", 61 => "As-Saff", 62 => "Al-Jumu'ah", 63 => "Al-Munafiqun", 64 => "At-Taghabun", 
        65 => "At-Talaq", 66 => "At-Tahrim", 67 => "Al-Mulk", 68 => "Al-Qalam", 69 => "Al-Haqqah", 70 => "Al-Ma'arij", 71 => "Nuh", 72 => "Al-Jinn", 
        73 => "Al-Muzzammil", 74 => "Al-Muddaththir", 75 => "Al-Qiyamah", 76 => "Al-Insan", 77 => "Al-Mursalat", 78 => "An-Naba'", 79 => "An-Nazi'at", 
        80 => "Abasa", 81 => "At-Takwir", 82 => "Al-Infitar", 83 => "Al-Mutaffifin", 84 => "Al-Inshiqaq", 85 => "Al-Buruj", 86 => "At-Tariq", 
        87 => "Al-A'la", 88 => "Al-Ghashiyah", 89 => "Al-Fajr", 90 => "Al-Balad", 91 => "Ash-Shams", 92 => "Al-Layl", 93 => "Ad-Duha", 
        94 => "Ash-Sharh", 95 => "At-Tin", 96 => "Al-Alaq", 97 => "Al-Qadr", 98 => "Al-Bayyinah", 99 => "Az-Zalzalah", 100 => "Al-Adiyat", 
        101 => "Al-Qari'ah", 102 => "At-Takathur", 103 => "Al-Asr", 104 => "Al-Humazah", 105 => "Al-Fil", 106 => "Quraysh", 107 => "Al-Ma'un", 
        108 => "Al-Kauthar", 109 => "Al-Kafirun", 110 => "An-Nasr", 111 => "Al-Masad", 112 => "Al-Ikhlas", 113 => "Al-Falaq", 114 => "An-Nas"
    );

    echo "<noscript>\n";
    echo "  <div class='seo-noscript-container' style='padding: 20px; max-width: 800px; margin: 0 auto; font-family: sans-serif; color: #333; background: #fff; border-radius: 8px;'>\n";

    if (preg_match('/\/surah\/(\d+)(?:\/ayah\/(\d+))?/', $relative_uri, $matches)) {
        $surah_num = intval($matches[1]);
        $ayah_num = isset($matches[2]) ? intval($matches[2]) : 1;
        
        if ($surah_num >= 1 && $surah_num <= 114) {
            $surah_name = $surah_names[$surah_num];
            echo "    <h1>Surah {$surah_name} Verse {$ayah_num}</h1>\n";
            echo "    <p>This is the pre-rendered study page for Quran Chapter {$surah_num}, Verse {$ayah_num}.</p>\n";
            echo "    <p>Please enable JavaScript to access full high-fidelity recitations, the interactive Al-Mualim Voice-First scholar chat hotline, and customized Tafseer view interfaces.</p>\n";
            
            // Output links to navigate Surahs for crawlability
            echo "    <div style='margin-top:20px; border-top:1px solid #eee; padding-top:10px;'>\n";
            echo "      <h3>Explore Quran Chapters:</h3>\n";
            echo "      <ul style='display:flex; flex-wrap:wrap; list-style:none; padding:0; gap:10px;'>\n";
            for ($s = 1; $s <= 114; $s++) {
                $name = $surah_names[$s];
                echo "        <li><a href='" . esc_url(home_url("/surah/{$s}/ayah/1")) . "' style='text-decoration:none; color:#0284c7;'>{$s}. {$name}</a></li>\n";
            }
            echo "      </ul>\n";
            echo "    </div>\n";
        }
    } elseif (preg_match('/\/page\/([a-zA-Z0-9_-]+)/', $relative_uri, $matches)) {
        $page_slug = sanitize_title($matches[1]);
        $pages = get_option('quran_theme_pages', array());
        $page = null;
        foreach ($pages as $p) {
            if ($p['slug'] === $page_slug) {
                $page = $p;
                break;
            }
        }
        
        if ($page) {
            echo "    <h1>" . esc_html($page['title']) . "</h1>\n";
            // Convert simple markdown headings & paragraphs to HTML
            $content_html = esc_html($page['content']);
            $content_html = preg_replace('/^# (.*)$/m', '<h1>$1</h1>', $content_html);
            $content_html = preg_replace('/^## (.*)$/m', '<h2>$1</h2>', $content_html);
            $content_html = preg_replace('/^### (.*)$/m', '<h3>$1</h3>', $content_html);
            $content_html = preg_replace('/^\* (.*)$/m', '<ul><li>$1</li></ul>', $content_html);
            $content_html = preg_replace('/^- (.*)$/m', '<ul><li>$1</li></ul>', $content_html);
            $content_html = nl2br($content_html);
            echo "    <div class='page-content'>{$content_html}</div>\n";
        } else {
            echo "    <h1>Page Not Found</h1>\n";
        }
    } else {
        // Homepage / general app view
        echo "    <h1>Welcome to " . esc_html(get_bloginfo('name')) . "</h1>\n";
        echo "    <p>" . esc_html(get_bloginfo('description')) . "</p>\n";
        echo "    <p>Please enable JavaScript to run this immersive digital Quran application. Al-Mualim delivers AI reflection voice chats, Tafseer annotations, and playback bookmarks in your browser.</p>\n";
        
        // Output home link list for bot crawlability
        echo "    <h3>Chapters of the Holy Quran:</h3>\n";
        echo "    <ul style='display:flex; flex-wrap:wrap; list-style:none; padding:0; gap:10px;'>\n";
        for ($s = 1; $s <= 114; $s++) {
            $name = $surah_names[$s];
            echo "      <li><a href='" . esc_url(home_url("/surah/{$s}/ayah/1")) . "' style='text-decoration:none; color:#0284c7;'>{$s}. {$name}</a></li>\n";
        }
        echo "    </ul>\n";
    }

    echo "  </div>\n";
    echo "</noscript>\n";
    ?>
</div>

<!-- Global variables configuration for the React Client -->
<script type="text/javascript">
    window.WP_API_BASE = '<?php echo esc_url( home_url( '/api/' ) ); ?>';
    window.WP_WS_URL = '<?php echo esc_js( get_option( "quran_theme_websocket_url", "" ) ); ?>';
</script>

<?php
get_footer();
