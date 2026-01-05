import dataMetadata from '../../data/dataMetadata.json';
import styles from './DataTimestamp.module.css';

interface DataTimestampProps {
  className?: string;
}

export default function DataTimestamp({ className }: DataTimestampProps) {
  const timestamp = dataMetadata.generatedAtShort || 'Unknown';

  return (
    <div className={`${styles.timestamp} ${className || ''}`}>
      <span className={styles.label}>Data:</span>
      <time dateTime={dataMetadata.generatedAt} className={styles.time}>
        {timestamp}
      </time>
    </div>
  );
}
