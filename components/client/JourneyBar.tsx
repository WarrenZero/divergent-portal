import { createClient } from '@/lib/supabase/server';
import styles from './JourneyBar.module.css';

interface Props {
  clientId: string;
}

const TOTAL_DAYS = 90;
const MILESTONES = [7, 14, 30, 60, 90];

function calcProtocolDay(startDate: string | null): number {
  if (!startDate) return 1;
  const diff = Math.floor(
    (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(1, diff + 1);
}

export default async function JourneyBar({ clientId }: Props) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('client_protocols')
    .select('current_phase, start_date, protocols(name)')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return (
      <div className={styles.bar}>
        <div className={styles.notReady}>
          Your plan is being prepared by Warren
        </div>
      </div>
    );
  }

  const day = calcProtocolDay(data.start_date ?? null);
  const week = data.current_phase ?? 1;
  const pct = Math.min(100, (day / TOTAL_DAYS) * 100);
  const nextMilestone = MILESTONES.find((m) => m > day) ?? 90;

  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <span className={styles.dayNum}>Day {day}</span>
          <span className={styles.sep}>of {TOTAL_DAYS}</span>
          <span className={styles.week}>· Week {week}</span>
        </div>
        <div className={styles.trackWrap}>
          <div className={styles.track}>
            <div className={styles.fill} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className={styles.milestone}>
          Next milestone: Day {nextMilestone} — Warren reviews your progress and adjusts your plan
        </div>
      </div>
    </div>
  );
}
