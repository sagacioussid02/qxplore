"""KenPom 2026 NCAA Tournament snapshot (data through March 15, 2026).

Each entry: normalized_team_name -> (kenpom_rank, sos_adj_em, luck)
  kenpom_rank : KenPom Adjusted Efficiency Margin rank (1 = best)
  sos_adj_em  : Strength of Schedule — AdjEM of opponents (higher = harder)
  luck        : Actual W% minus expected W% based on efficiency.
                Positive = won more than expected (regression risk).
                Negative = won fewer than expected (potential underdog value).
                Typical range: -0.10 to +0.10

Multiple keys map to the same team to handle different naming conventions
used by SportsDataIO, the fallback JSON, and KenPom itself.
"""
from __future__ import annotations
import re

# (kenpom_rank, sos_adj_em, luck) for all 68 tournament teams
_TEAMS: dict[str, tuple[int, float, float]] = {
    # ── Seeds 1 ─────────────────────────────────────────────────────────────
    "duke":             (1,  14.29,  0.049),
    "arizona":          (2,  14.97,  0.023),
    "michigan":         (3,  16.65,  0.045),
    "florida":          (4,  16.01, -0.036),
    # ── Seeds 2 ─────────────────────────────────────────────────────────────
    "houston":          (5,  13.58, -0.006),
    "iowa st":          (6,  12.44, -0.012),
    "iowa st.":         (6,  12.44, -0.012),
    "iowa state":       (6,  12.44, -0.012),
    "purdue":           (8,  15.88, -0.006),
    "connecticut":      (11, 12.01,  0.055),
    "uconn":            (11, 12.01,  0.055),
    # ── Seeds 3 ─────────────────────────────────────────────────────────────
    "illinois":         (7,  13.64, -0.050),
    "michigan st":      (9,  13.69,  0.005),
    "michigan st.":     (9,  13.69,  0.005),
    "michigan state":   (9,  13.69,  0.005),
    "gonzaga":          (10,  5.89,  0.072),
    "virginia":         (13,  9.95,  0.056),
    # ── Seeds 4 ─────────────────────────────────────────────────────────────
    "nebraska":         (14, 11.59,  0.034),
    "arkansas":         (15, 14.95,  0.051),
    "alabama":          (18, 16.75,  0.019),
    "kansas":           (21, 16.95,  0.053),
    # ── Seeds 5 ─────────────────────────────────────────────────────────────
    "vanderbilt":       (12, 14.56,  0.018),
    "st. john's":       (17, 11.52,  0.061),
    "st johns":         (17, 11.52,  0.061),
    "saint johns":      (17, 11.52,  0.061),
    "texas tech":       (20, 15.64,  0.006),
    "wisconsin":        (22, 13.93,  0.041),
    # ── Seeds 6 ─────────────────────────────────────────────────────────────
    "tennessee":        (16, 14.77, -0.060),
    "louisville":       (19, 12.55, -0.020),
    "byu":              (23, 14.27, -0.017),
    "north carolina":   (29, 11.46,  0.057),
    "n. carolina":      (29, 11.46,  0.057),
    "unc":              (29, 11.46,  0.057),
    # ── Seeds 7 ─────────────────────────────────────────────────────────────
    "saint mary's":     (24,  4.99,  0.011),
    "saint marys":      (24,  4.99,  0.011),
    "st. mary's":       (24,  4.99,  0.011),
    "ucla":             (27, 12.22,  0.017),
    "miami fl":         (31,  7.99,  0.021),
    "miami (fl)":       (31,  7.99,  0.021),
    "miami florida":    (31,  7.99,  0.021),
    "kentucky":         (28, 15.92, -0.019),
    # ── Seeds 8 ─────────────────────────────────────────────────────────────
    "ohio st":          (26, 13.67, -0.031),
    "ohio st.":         (26, 13.67, -0.031),
    "ohio state":       (26, 13.67, -0.031),
    "georgia":          (32, 10.78, -0.005),
    "villanova":        (33, 10.37,  0.067),
    "clemson":          (36, 10.53,  0.011),
    # ── Seeds 9 ─────────────────────────────────────────────────────────────
    "iowa":             (25, 11.37, -0.061),
    "utah st":          (30,  7.13,  0.065),
    "utah st.":         (30,  7.13,  0.065),
    "utah state":       (30,  7.13,  0.065),
    "saint louis":      (41,  1.03,  0.030),
    "st. louis":        (41,  1.03,  0.030),
    "tcu":              (43, 11.04,  0.004),
    # ── Seeds 10 ────────────────────────────────────────────────────────────
    "santa clara":      (35,  6.02,  0.015),
    "texas a&m":        (39, 11.15, -0.002),
    "missouri":         (52, 11.51,  0.041),
    "ucf":              (54, 11.91,  0.097),
    # ── Seeds 11 (includes First Four teams) ────────────────────────────────
    "nc state":         (34, 11.97, -0.029),
    "n.c. state":       (34, 11.97, -0.029),
    "north carolina state": (34, 11.97, -0.029),
    "texas":            (37, 13.70, -0.083),
    "smu":              (42, 11.15, -0.043),
    "vcu":              (45,  3.49, -0.007),
    "south florida":    (47,  3.04, -0.026),
    "usf":              (47,  3.04, -0.026),
    "miami oh":         (93, -5.37,  0.099),
    "miami (oh)":       (93, -5.37,  0.099),
    "miami ohio":       (93, -5.37,  0.099),
    # ── Seeds 12 ────────────────────────────────────────────────────────────
    "akron":            (64, -3.65,  0.018),
    "mcneese":          (68, -1.86,  0.084),
    "mcneese st":       (68, -1.86,  0.084),
    "mcneese st.":      (68, -1.86,  0.084),
    "northern iowa":    (72,  1.27, -0.070),
    "n. iowa":          (72,  1.27, -0.070),
    "high point":       (92, -9.23,  0.048),
    # ── Seeds 13 ────────────────────────────────────────────────────────────
    "hofstra":          (87, -0.91, -0.052),
    "cal baptist":      (106, -1.95,  0.091),
    "hawaii":           (108, -3.37,  0.038),
    "troy":             (143, -3.23,  0.024),
    # ── Seeds 14 ────────────────────────────────────────────────────────────
    "north dakota st":  (113, -5.83,  0.040),
    "north dakota st.": (113, -5.83,  0.040),
    "north dakota state": (113, -5.83,  0.040),
    "wright st":        (140, -4.03,  0.009),
    "wright st.":       (140, -4.03,  0.009),
    "wright state":     (140, -4.03,  0.009),
    "penn":             (150, -0.69,  0.068),
    "kennesaw st":      (163, -2.23,  0.009),
    "kennesaw st.":     (163, -2.23,  0.009),
    "kennesaw state":   (163, -2.23,  0.009),
    # ── Seeds 15 ────────────────────────────────────────────────────────────
    "idaho":            (145, -1.67, -0.012),
    "queens":           (181, -5.66,  0.067),
    "tennessee st":     (187, -8.26,  0.070),
    "tennessee st.":    (187, -8.26,  0.070),
    "tennessee state":  (187, -8.26,  0.070),
    "furman":           (191, -6.29,  0.010),
    # ── Seeds 16 (includes First Four teams) ────────────────────────────────
    "umbc":             (185, -14.87,  0.046),
    "siena":            (192,  -9.48,  0.005),
    "howard":           (207, -14.60, -0.010),
    "liu":              (216,  -9.97,  0.104),
    "lehigh":           (284,  -8.61,  0.081),
    "prairie view a&m": (288,  -9.59,  0.013),
    "prairie view":     (288,  -9.59,  0.013),
}


def _normalize(name: str) -> str:
    """Lowercase, collapse whitespace, strip trailing punctuation."""
    return re.sub(r"\s+", " ", name.lower().strip().rstrip("."))


def lookup(team_name: str) -> tuple[int, float, float] | None:
    """Return (kenpom_rank, sos_adj_em, luck) for a team, or None if not found."""
    return _TEAMS.get(_normalize(team_name))
