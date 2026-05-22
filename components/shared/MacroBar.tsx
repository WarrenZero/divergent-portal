'use client';

import styles from './MacroBar.module.css';

export interface Macros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

// Oxidizer type for metabolic fit note (client-side only)
export type OxidizerType = 'fast' | 'slow' | null;

interface Props {
  macros: Macros;
  oxidizer?: OxidizerType;
}

export default function MacroBar({ macros, oxidizer }: Props) {
  const { calories, protein_g, carbs_g, fat_g, fiber_g } = macros;

  // Total grams of P + C + F used to calculate relative bar widths
  const total = protein_g + carbs_g + fat_g;
  const pct = (g: number) => (total > 0 ? Math.round((g / total) * 100) : 33);

  const metabolicNote =
    oxidizer === 'fast'
      ? 'Fat is the optimal fuel for your fast oxidizer metabolic type'
      : oxidizer === 'slow'
      ? 'Protein is the optimal fuel for your slow oxidizer metabolic type'
      : null;

  return (
    <div className={styles.wrap}>
      {/* Calories */}
      <div className={styles.calRow}>
        <span className={styles.calValue}>{calories}</span>
        <span className={styles.calLabel}>kcal</span>
      </div>

      {/* Macro bars */}
      <div className={styles.bars}>
        <div className={styles.barRow}>
          <span className={styles.barLabel}>Protein</span>
          <div className={styles.barTrack}>
            <div
              className={`${styles.barFill} ${styles.barProtein} ${oxidizer === 'slow' ? styles.barOptimal : ''}`}
              style={{ width: `${pct(protein_g)}%` }}
            />
          </div>
          <span className={styles.barGrams}>{protein_g}g</span>
        </div>

        <div className={styles.barRow}>
          <span className={styles.barLabel}>Carbs</span>
          <div className={styles.barTrack}>
            <div
              className={`${styles.barFill} ${styles.barCarbs}`}
              style={{ width: `${pct(carbs_g)}%` }}
            />
          </div>
          <span className={styles.barGrams}>{carbs_g}g</span>
        </div>

        <div className={styles.barRow}>
          <span className={styles.barLabel}>Fat</span>
          <div className={styles.barTrack}>
            <div
              className={`${styles.barFill} ${styles.barFat} ${oxidizer === 'fast' ? styles.barOptimal : ''}`}
              style={{ width: `${pct(fat_g)}%` }}
            />
          </div>
          <span className={styles.barGrams}>{fat_g}g</span>
        </div>
      </div>

      <div className={styles.fiber}>Fiber: {fiber_g}g</div>

      {metabolicNote && (
        <div className={styles.metabolicNote}>✦ {metabolicNote}</div>
      )}
    </div>
  );
}
