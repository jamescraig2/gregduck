import styles from './page.module.css'

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Gray Duck</h1>
      <p className={styles.tagline}>Discover the wildlife around you.</p>
    </main>
  )
}
