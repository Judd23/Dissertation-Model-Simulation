import { motion } from 'framer-motion';
import { DANCE_SPRING_HEAVY } from '../../lib/transitionConfig';
import styles from './Toggle.module.css';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  id: string;
}

export default function Toggle({ checked, onChange, label, id }: ToggleProps) {
  return (
    <motion.label
      className={`${styles.toggle} interactiveSurface`}
      htmlFor={id}
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={DANCE_SPRING_HEAVY}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        className={styles.input}
      />
      <span className={styles.slider} />
      <span className={styles.label}>{label}</span>
    </motion.label>
  );
}
