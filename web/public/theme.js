(function() {
	//#region src/lib/accent.ts
	/** Opaque, contrast-checked hat roles. OKLab matrices: CSS Color 4 §9. */
	var DEFAULT_ACCENT = "#64748b";
	var HEX = /^#[0-9a-f]{6}$/i;
	var ACCENT_ROLES = [
		"accent",
		"accent-hover",
		"accent-fg",
		"on-accent",
		"accent-wash",
		"accent-soft",
		"selected",
		"focus-ring",
		"focus-halo"
	];
	var SURFACES = {
		light: [
			"#f8f9fb",
			"#ffffff",
			"#f1f2f5",
			"#f1f3f7"
		],
		dark: [
			"#141517",
			"#1a1c1e",
			"#202223",
			"#17191b",
			"#26292b"
		]
	};
	var linear = (v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
	var gamma = (v) => v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055;
	var rgb = (hex) => [
		1,
		3,
		5
	].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
	var hex = (values) => "#" + values.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
	function contrast(a, b) {
		const lum = (c) => rgb(c).map(linear).reduce((n, v, i) => n + v * [
			.2126,
			.7152,
			.0722
		][i], 0);
		const x = lum(a), y = lum(b);
		return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
	}
	function toOKLCH(colour) {
		const [r, g, b] = rgb(colour).map(linear);
		const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
		const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
		const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
		const a = 1.9779984951 * l - 2.428592205 * m + .4505937099 * s;
		const bb = .0259040371 * l + .7827717662 * m - .808675766 * s;
		return [
			.2104542553 * l + .793617785 * m - .0040720468 * s,
			Math.hypot(a, bb),
			Math.atan2(bb, a)
		];
	}
	/** Reduce chroma until in gamut; never clip RGB channels. */
	function inGamut(L, C, h) {
		for (let step = 0; step <= 40; step++) {
			const c = step === 40 ? 0 : C * (1 - step / 40);
			const a = c * Math.cos(h), b = c * Math.sin(h);
			const l = (L + .3963377774 * a + .2158037573 * b) ** 3;
			const m = (L - .1055613458 * a - .0638541728 * b) ** 3;
			const s = (L - .0894841775 * a - 1.291485548 * b) ** 3;
			const channels = [
				4.0767416621 * l - 3.3077115913 * m + .2309699292 * s,
				-1.2684380046 * l + 2.6097574011 * m - .3413193965 * s,
				-.0041960863 * l - .7034186147 * m + 1.707614701 * s
			];
			if (channels.every((v) => v >= 0 && v <= 1)) return hex(channels.map(gamma));
		}
		return L < .5 ? "#000000" : "#ffffff";
	}
	function palette(source, theme) {
		const [, chroma, hue] = toOKLCH(source);
		const dark = theme === "dark";
		const C = chroma < .02 ? 0 : Math.max(dark ? .06 : .08, Math.min(chroma, dark ? .16 : .18));
		const wash = inGamut(dark ? .28 : .96, Math.min(C, dark ? .05 : .03), hue);
		const soft = inGamut(dark ? .31 : .93, Math.min(C, dark ? .05 : .03), hue);
		const selected = inGamut(dark ? .3 : .94, Math.min(C, dark ? .05 : .03), hue);
		const surfaces = [
			...SURFACES[theme],
			wash,
			soft,
			selected
		];
		const search = (start, backgrounds, target) => {
			for (let step = 0; step <= 100; step++) {
				const result = inGamut(dark ? start + (1 - start) * step / 100 : start * (1 - step / 100), C, hue);
				if (backgrounds.every((bg) => contrast(result, bg) >= target)) return result;
			}
			return dark ? "#ffffff" : "#000000";
		};
		const accent = search(dark ? .72 : .52, surfaces, 4.5);
		const hover = search(dark ? .8 : .46, surfaces, 4.5);
		const onAccent = ["#ffffff", "#141517"].sort((a, b) => Math.min(contrast(b, accent), contrast(b, hover)) - Math.min(contrast(a, accent), contrast(a, hover)))[0];
		return {
			accent,
			"accent-hover": hover,
			"accent-fg": search(dark ? .76 : .48, surfaces, 4.5),
			"on-accent": onAccent,
			"accent-wash": wash,
			"accent-soft": soft,
			selected,
			"focus-ring": search(dark ? .76 : .48, surfaces, 3),
			"focus-halo": inGamut(dark ? .38 : .87, Math.min(C, .035), hue)
		};
	}
	function deriveAccent(input) {
		const source = input && HEX.test(input) ? input.toLowerCase() : DEFAULT_ACCENT;
		return {
			source,
			light: palette(source, "light"),
			dark: palette(source, "dark")
		};
	}
	//#endregion
	//#region src/lib/theme-record.ts
	var THEME_KEY = "hennery.theme";
	var isPreference = (p) => p === "system" || p === "light" || p === "dark";
	function isPalette(value) {
		if (!value || typeof value !== "object" || Array.isArray(value)) return false;
		const p = value;
		return Object.keys(p).length === ACCENT_ROLES.length && ACCENT_ROLES.every((key) => typeof p[key] === "string" && HEX.test(p[key]));
	}
	function makeTheme(preference = "system", source = DEFAULT_ACCENT) {
		return {
			version: 1,
			preference,
			...deriveAccent(source)
		};
	}
	function readTheme(raw) {
		try {
			const v = JSON.parse(raw ?? "null");
			if (!v || typeof v !== "object" || Array.isArray(v)) return makeTheme();
			const o = v;
			if (Object.keys(o).length === 2 && typeof o["--accent"] === "string" && HEX.test(o["--accent"]) && typeof o["--accent-2"] === "string" && HEX.test(o["--accent-2"])) return makeTheme("system", o["--accent"]);
			if (Object.keys(o).length !== 5 || o.version !== 1 || !isPreference(o.preference) || typeof o.source !== "string" || !HEX.test(o.source) || !isPalette(o.light) || !isPalette(o.dark)) return makeTheme();
			const expected = deriveAccent(o.source);
			if (!ACCENT_ROLES.every((key) => o.light && o.dark && o.light[key] === expected.light[key] && o.dark[key] === expected.dark[key])) return makeTheme();
			return {
				version: 1,
				preference: o.preference,
				...expected
			};
		} catch {
			return makeTheme();
		}
	}
	function applyTheme(record, systemDark) {
		const theme = record.preference === "system" ? systemDark ? "dark" : "light" : record.preference;
		const root = document.documentElement;
		root.dataset.theme = theme;
		root.style.colorScheme = theme;
		for (const key of ACCENT_ROLES) root.style.setProperty(`--hn-${key}`, record[theme][key]);
		document.querySelector("meta[name=\"theme-color\"]")?.setAttribute("content", theme === "dark" ? "#141517" : "#f8f9fb");
		return theme;
	}
	//#endregion
	//#region src/lib/theme-bootstrap.ts
	var raw = null;
	try {
		raw = localStorage.getItem(THEME_KEY);
	} catch {}
	var record = readTheme(raw);
	applyTheme(record, window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);
	try {
		localStorage.setItem(THEME_KEY, JSON.stringify(record));
	} catch {}
	//#endregion
})();
