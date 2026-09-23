import styles from './Stage.module.css';

export default function Stage({ children, className = '' }) {
  return <main className={`${styles.stage} ${className}`}>{children}</main>;
}
