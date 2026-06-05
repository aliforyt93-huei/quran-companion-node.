<?php
/**
 * The template for displaying the header
 */
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?> class="h-full">
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <?php
    // Detect request URL path for dynamic SEO injection
    $request_uri = $_SERVER['REQUEST_URI'];
    
    // Parse subdirectory installs
    $home_path = parse_url(home_url(), PHP_URL_PATH);
    if ($home_path && $home_path !== '/') {
        $relative_uri = str_replace($home_path, '', $request_uri);
    } else {
        $relative_uri = $request_uri;
    }
    $relative_uri = '/' . ltrim($relative_uri, '/');

    // Default SEO values
    $seo_title = get_bloginfo('name') . ' - Immersive Quran Study Companion';
    $seo_desc = 'An immersive spiritual experience to read, listen, recite, and understand the Holy Quran, powered by Al-Mualim scholar AI.';
    $seo_keywords = 'Quran, recitation, Al-Mualim, Islamic companion AI, Tafsir, Tajweed';
    $canonical_url = home_url(ltrim($relative_uri, '/'));
    $schemas = array();

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

    // 1. Handle Surah Routing SEO
    if (preg_match('/\/surah\/(\d+)(?:\/ayah\/(\d+))?/', $relative_uri, $matches)) {
        $surah_num = intval($matches[1]);
        $ayah_num = isset($matches[2]) ? intval($matches[2]) : 1;
        
        if ($surah_num >= 1 && $surah_num <= 114) {
            $surah_name = $surah_names[$surah_num];
            $seo_title = "Surah {$surah_name} Verse {$ayah_num} (Quran {$surah_num}:{$ayah_num}) - Meaning & Tafsir";
            $seo_desc = "Read Surah {$surah_name} Ayat {$ayah_num} in Arabic with English translation, transliteration, and classical Tafseer insights.";
            $seo_keywords = "Surah {$surah_name}, Quran {$surah_num}:{$ayah_num}, Tafsir, Quran translation, Al-Mualim";
            
            // Build dynamic schema structures
            $schemas[] = array(
                "@context" => "https://schema.org",
                "@type" => "Article",
                "headline" => $seo_title,
                "description" => $seo_desc,
                "url" => $canonical_url
            );
            $schemas[] = array(
                "@context" => "https://schema.org",
                "@type" => "BreadcrumbList",
                "itemListElement" => array(
                    array("@type" => "ListItem", "position" => 1, "name" => "Quran Home", "item" => home_url('/')),
                    array("@type" => "ListItem", "position" => 2, "name" => "Surah {$surah_name}", "item" => home_url("/surah/{$surah_num}/ayah/1")),
                    array("@type" => "ListItem", "position" => 3, "name" => "Verse {$ayah_num}", "item" => $canonical_url)
                )
            );
        }
    } 
    // 2. Handle Custom Page Routing SEO
    elseif (preg_match('/\/page\/([a-zA-Z0-9_-]+)/', $relative_uri, $matches)) {
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
            $seo_title = !empty($page['seoTitle']) ? $page['seoTitle'] : $page['title'];
            $seo_desc = !empty($page['seoDescription']) ? $page['seoDescription'] : wp_strip_all_tags(wp_trim_words($page['content'], 30));
            $seo_keywords = !empty($page['seoKeywords']) ? $page['seoKeywords'] : '';
            
            $schemas[] = array(
                "@context" => "https://schema.org",
                "@type" => "Article",
                "headline" => $page['title'],
                "description" => $seo_desc,
                "url" => $canonical_url,
                "datePublished" => isset($page['created']) ? $page['created'] : '',
                "dateModified" => isset($page['modified']) ? $page['modified'] : ''
            );
        }
    }
    
    // Print dynamic SEO tags
    echo '<title>' . esc_html($seo_title) . '</title>' . "\n";
    echo '    <meta name="description" content="' . esc_attr($seo_desc) . '">' . "\n";
    if (!empty($seo_keywords)) {
        echo '    <meta name="keywords" content="' . esc_attr($seo_keywords) . '">' . "\n";
    }
    echo '    <link rel="canonical" href="' . esc_url($canonical_url) . '">' . "\n";
    
    // Print JSON-LD schemas
    foreach ($schemas as $schema) {
        echo '    <script type="application/ld+json">' . json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>' . "\n";
    }
    ?>

    <?php wp_head(); ?>
</head>
<body <?php body_class('h-full bg-[#0a0514] text-white overflow-x-hidden antialiased font-sans'); ?>>
<?php wp_body_open(); ?>
