/**
 * RunsPage - Run Library for viewing pipeline run results.
 *
 * Displays a list of available runs from runs_index.json and allows
 * viewing individual run manifests with their artifacts.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  fetchRunsIndex,
  fetchRunManifest,
  getArtifactUrl,
  formatRunTimestamp,
  type RunIndexEntry,
  type RunManifest,
} from "../lib/runs";
import {
  containerVariants,
  itemVariants,
  VIEWPORT_CONFIG,
} from "../lib/transitionConfig";
import styles from "./RunsPage.module.css";

export default function RunsPage() {
  const [runs, setRuns] = useState<RunIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedManifest, setSelectedManifest] = useState<RunManifest | null>(
    null,
  );
  const [manifestLoading, setManifestLoading] = useState(false);

  // Fetch runs index on mount
  useEffect(() => {
    async function loadRuns() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchRunsIndex();
        setRuns(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load runs");
      } finally {
        setLoading(false);
      }
    }
    loadRuns();
  }, []);

  // Fetch manifest when a run is selected
  useEffect(() => {
    if (!selectedRunId) {
      setSelectedManifest(null);
      return;
    }

    async function loadManifest() {
      setManifestLoading(true);
      try {
        const manifest = await fetchRunManifest(selectedRunId!);
        setSelectedManifest(manifest);
      } catch (err) {
        console.warn("Failed to load manifest:", err);
        setSelectedManifest(null);
      } finally {
        setManifestLoading(false);
      }
    }
    loadManifest();
  }, [selectedRunId]);

  const handleRunClick = (runId: string) => {
    setSelectedRunId(selectedRunId === runId ? null : runId);
  };

  return (
    <motion.div
      className={styles.runsPage}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      viewport={VIEWPORT_CONFIG}
    >
      {/* Header */}
      <motion.header className={styles.header} variants={itemVariants}>
        <h1 className={styles.title}>Run Library</h1>
        <p className={styles.subtitle}>
          View results from SEM pipeline runs. Select a run to see details and
          artifacts.
        </p>
      </motion.header>

      {/* Loading state */}
      {loading && (
        <motion.div className={styles.loadingState} variants={itemVariants}>
          Loading runs...
        </motion.div>
      )}

      {/* Error state */}
      {error && (
        <motion.div className={styles.errorState} variants={itemVariants}>
          {error}
        </motion.div>
      )}

      {/* Empty state */}
      {!loading && !error && runs.length === 0 && (
        <motion.div className={styles.emptyState} variants={itemVariants}>
          <p>No runs found.</p>
          <p className={styles.emptyStateSubtext}>
            Run the pipeline with <code>RUN_ID=...</code> to generate results.
          </p>
        </motion.div>
      )}

      {/* Runs list */}
      {!loading && !error && runs.length > 0 && (
        <motion.div className={styles.runsGrid} variants={containerVariants}>
          {runs.map((run) => (
            <motion.div
              key={run.run_id}
              className={`${styles.runCard} ${selectedRunId === run.run_id ? styles.selected : ""}`}
              variants={itemVariants}
              onClick={() => handleRunClick(run.run_id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className={styles.runCardHeader}>
                <span className={styles.runId}>{run.run_id}</span>
                <span
                  className={`${styles.modeBadge} ${styles[`modeBadge${run.label.split(" - ")[0].replace("_", "")}`]}`}
                >
                  {run.label.split(" - ")[0]}
                </span>
              </div>
              <div className={styles.runCardMeta}>
                <span>📅 {formatRunTimestamp(run.timestamp)}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Selected run details */}
      {selectedRunId && (
        <motion.div
          className={styles.detailsPanel}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <div className={styles.detailsHeader}>
            <h2 className={styles.detailsTitle}>{selectedRunId}</h2>
            <button
              className={styles.closeButton}
              onClick={() => setSelectedRunId(null)}
              aria-label="Close details"
            >
              ×
            </button>
          </div>

          {manifestLoading && (
            <p className={styles.loadingState}>Loading manifest...</p>
          )}

          {!manifestLoading && !selectedManifest && (
            <p className={styles.errorState}>
              Could not load manifest for this run.
            </p>
          )}

          {!manifestLoading && selectedManifest && (
            <>
              {/* Settings */}
              <div className={styles.detailsSection}>
                <h3 className={styles.sectionTitle}>Settings</h3>
                <div className={styles.settingsGrid}>
                  <div className={styles.settingItem}>
                    <div className={styles.settingLabel}>Mode</div>
                    <div className={styles.settingValue}>
                      {selectedManifest.mode}
                    </div>
                  </div>
                  <div className={styles.settingItem}>
                    <div className={styles.settingLabel}>Timestamp</div>
                    <div className={styles.settingValue}>
                      {formatRunTimestamp(selectedManifest.timestamp)}
                    </div>
                  </div>
                  {selectedManifest.settings?.N && (
                    <div className={styles.settingItem}>
                      <div className={styles.settingLabel}>Sample Size</div>
                      <div className={styles.settingValue}>
                        {selectedManifest.settings.N.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {selectedManifest.settings?.bootstrap && (
                    <div className={styles.settingItem}>
                      <div className={styles.settingLabel}>Bootstrap B</div>
                      <div className={styles.settingValue}>
                        {selectedManifest.settings.bootstrap.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {selectedManifest.settings?.CI && (
                    <div className={styles.settingItem}>
                      <div className={styles.settingLabel}>CI Type</div>
                      <div className={styles.settingValue}>
                        {selectedManifest.settings.CI}
                      </div>
                    </div>
                  )}
                  {selectedManifest.settings?.estimator && (
                    <div className={styles.settingItem}>
                      <div className={styles.settingLabel}>Estimator</div>
                      <div className={styles.settingValue}>
                        {selectedManifest.settings.estimator}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tables */}
              {selectedManifest.artifacts?.tables &&
                selectedManifest.artifacts.tables.length > 0 && (
                  <div className={styles.detailsSection}>
                    <h3 className={styles.sectionTitle}>Tables</h3>
                    <ul className={styles.artifactsList}>
                      {selectedManifest.artifacts.tables.map((table) => (
                        <li key={table} className={styles.artifactItem}>
                          <span className={styles.artifactIcon}>📄</span>
                          <a
                            href={getArtifactUrl(
                              selectedRunId,
                              `tables/${table}`,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.artifactLink}
                          >
                            {table}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Figures */}
              {selectedManifest.artifacts?.figures &&
                selectedManifest.artifacts.figures.length > 0 && (
                  <div className={styles.detailsSection}>
                    <h3 className={styles.sectionTitle}>Figures</h3>
                    <ul className={styles.artifactsList}>
                      {selectedManifest.artifacts.figures.map((figure) => (
                        <li key={figure} className={styles.artifactItem}>
                          <span className={styles.artifactIcon}>📊</span>
                          <a
                            href={getArtifactUrl(
                              selectedRunId,
                              `figures/${figure}`,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.artifactLink}
                          >
                            {figure}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Raw artifacts */}
              <div className={styles.detailsSection}>
                <h3 className={styles.sectionTitle}>Raw Outputs</h3>
                <ul className={styles.artifactsList}>
                  {selectedManifest.artifacts?.fit_measures && (
                    <li className={styles.artifactItem}>
                      <span className={styles.artifactIcon}>📈</span>
                      <a
                        href={getArtifactUrl(
                          selectedRunId,
                          selectedManifest.artifacts.fit_measures,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.artifactLink}
                      >
                        Fit Measures
                      </a>
                    </li>
                  )}
                  {selectedManifest.artifacts?.parameters && (
                    <li className={styles.artifactItem}>
                      <span className={styles.artifactIcon}>📊</span>
                      <a
                        href={getArtifactUrl(
                          selectedRunId,
                          selectedManifest.artifacts.parameters,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.artifactLink}
                      >
                        Parameter Estimates
                      </a>
                    </li>
                  )}
                  {selectedManifest.artifacts?.verification_checklist && (
                    <li className={styles.artifactItem}>
                      <span className={styles.artifactIcon}>✅</span>
                      <a
                        href={getArtifactUrl(
                          selectedRunId,
                          selectedManifest.artifacts.verification_checklist,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.artifactLink}
                      >
                        Verification Checklist
                      </a>
                    </li>
                  )}
                  {selectedManifest.artifacts?.bootstrap_results && (
                    <li className={styles.artifactItem}>
                      <span className={styles.artifactIcon}>🔄</span>
                      <a
                        href={getArtifactUrl(
                          selectedRunId,
                          selectedManifest.artifacts.bootstrap_results,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.artifactLink}
                      >
                        Bootstrap Results
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            </>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
