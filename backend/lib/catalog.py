"""Server-owned catalogs: cosmetics (prices live here, never trusted from the browser) and achievements."""

SKINS = [
    {"id": "skin-classic", "name": "Classic Leaf", "price": 0, "preview": "#4fb86a,#5cc777"},
    {"id": "skin-sky", "name": "Sky Drop", "price": 50, "preview": "#4aa8e0,#6cc0ee"},
    {"id": "skin-sunset", "name": "Sunset", "price": 80, "preview": "#f08a3c,#f6a85c"},
    {"id": "skin-berry", "name": "Berry Pop", "price": 120, "preview": "#e0558f,#ee7aa8"},
    {"id": "skin-lemon", "name": "Lemon Zest", "price": 150, "preview": "#e7c320,#f2d84f"},
    {"id": "skin-midnight", "name": "Midnight Moth", "price": 250, "preview": "#3b4f8f,#5468ad"},
    {"id": "skin-rainbow", "name": "Rainbow", "price": 300, "preview": "#e5483b,#f1ae2d,#4fb86a,#3ba3e6,#9b6ee0"},
]
HATS = [
    {"id": "hat-cap", "name": "Explorer Cap", "price": 60, "preview": "🧢"},
    {"id": "hat-bow", "name": "Ribbon Bow", "price": 70, "preview": "🎀"},
    {"id": "hat-flower", "name": "Daisy", "price": 80, "preview": "🌼"},
    {"id": "hat-party", "name": "Party Hat", "price": 100, "preview": "🥳"},
    {"id": "hat-tophat", "name": "Top Hat", "price": 180, "preview": "🎩"},
    {"id": "hat-grad", "name": "Scholar", "price": 220, "preview": "🎓"},
    {"id": "hat-crown", "name": "Forest Crown", "price": 300, "preview": "👑"},
]
COSMETICS = {**{s["id"]: {**s, "kind": "skin"} for s in SKINS}, **{h["id"]: {**h, "kind": "hat"} for h in HATS}}
DEFAULT_SKIN = "skin-classic"

# id, name, description, icon, stat key, target
ACHIEVEMENTS = [
    ("first_apple", "First Apple", "Collect your first apple.", "🍎", "apples_total", 1),
    ("first_golden", "First Golden Apple", "Munch a shiny golden apple.", "🌟", "golden_total", 1),
    ("worm_beginner", "Worm Beginner", "Complete 5 levels.", "🐛", "completed_levels", 5),
    ("portal_finder", "Portal Finder", "Complete 10 levels.", "🌀", "completed_levels", 10),
    ("master_solver", "Master Solver", "Complete 25 levels.", "🧠", "completed_levels", 25),
    ("worm_legend", "Worm Legend", "Complete all 50 levels.", "🏆", "completed_levels", 50),
    ("perfect_route", "Perfect Route", "Finish a level with a perfect run.", "✨", "perfect_count", 1),
    ("perfect_ten", "10 Perfect Levels", "Earn 10 perfect completions.", "💎", "perfect_count", 10),
    ("apple_collector", "Apple Collector", "Collect 500 apples.", "🧺", "apples_total", 500),
    ("star_collector", "Star Collector", "Earn 100 stars.", "⭐", "total_stars", 100),
    ("ad_smart", "Ad Smart", "Use a rewarded recovery (revive or extra moves).", "❤️‍🩹", "recovery_used", 1),
    ("economy_explorer", "Economy Explorer", "Use 3 different reward features.", "🧭", "reward_type_count", 3),
    ("daily_hero", "Daily Hero", "Complete a daily challenge.", "📅", "daily_completed", 1),
    ("stylish_worm", "Stylish Worm", "Buy your first skin or hat.", "🎩", "cosmetics_bought", 1),
]
