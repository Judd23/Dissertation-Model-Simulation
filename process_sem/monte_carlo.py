"""
Monte Carlo Simulation Engine for Process-SEM Study

This module provides the core functionality for running Monte Carlo simulations
for Structural Equation Modeling (SEM) studies.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Callable, Optional, Tuple
from dataclasses import dataclass
import logging
from tqdm import tqdm
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class SimulationConfig:
    """Configuration for Monte Carlo simulation"""
    n_simulations: int = 1000
    sample_size: int = 200
    random_seed: Optional[int] = 42
    parallel: bool = False
    n_jobs: int = -1
    save_intermediate: bool = False
    

class MonteCarloSimulator:
    """
    Main class for running Monte Carlo simulations.
    
    This class handles the execution of repeated simulations and
    aggregates the results for statistical analysis.
    """
    
    def __init__(self, config: SimulationConfig):
        """
        Initialize the Monte Carlo simulator.
        
        Args:
            config: SimulationConfig object with simulation parameters
        """
        self.config = config
        self.results = []
        self.summary_stats = {}
        
        if config.random_seed is not None:
            np.random.seed(config.random_seed)
            
    def generate_data(self, sample_size: int, **params) -> np.ndarray:
        """
        Generate synthetic data for one simulation iteration.
        
        Args:
            sample_size: Number of observations to generate
            **params: Additional parameters for data generation
            
        Returns:
            Generated data as numpy array
        """
        # Example: Generate correlated multivariate normal data
        n_vars = params.get('n_variables', 5)
        correlation_matrix = params.get('correlation_matrix', np.eye(n_vars))
        means = params.get('means', np.zeros(n_vars))
        
        data = np.random.multivariate_normal(
            mean=means,
            cov=correlation_matrix,
            size=sample_size
        )
        
        return data
    
    def run_single_iteration(
        self, 
        iteration: int, 
        data_generator: Callable,
        estimator: Callable,
        **kwargs
    ) -> Dict:
        """
        Run a single Monte Carlo iteration.
        
        Args:
            iteration: Iteration number
            data_generator: Function to generate data
            estimator: Function to estimate model parameters
            **kwargs: Additional arguments
            
        Returns:
            Dictionary with iteration results
        """
        try:
            # Generate data
            data = data_generator(self.config.sample_size, **kwargs)
            
            # Estimate model
            estimates = estimator(data, **kwargs)
            
            # Store results
            result = {
                'iteration': iteration,
                'converged': estimates.get('converged', True),
                'estimates': estimates.get('parameters', {}),
                'standard_errors': estimates.get('standard_errors', {}),
                'fit_indices': estimates.get('fit_indices', {})
            }
            
            return result
            
        except Exception as e:
            logger.warning(f"Iteration {iteration} failed: {str(e)}")
            return {
                'iteration': iteration,
                'converged': False,
                'error': str(e)
            }
    
    def run(
        self,
        data_generator: Callable,
        estimator: Callable,
        **kwargs
    ) -> pd.DataFrame:
        """
        Run the full Monte Carlo simulation.
        
        Args:
            data_generator: Function to generate synthetic data
            estimator: Function to estimate model parameters
            **kwargs: Additional arguments passed to data_generator and estimator
            
        Returns:
            DataFrame with all simulation results
        """
        logger.info(f"Starting Monte Carlo simulation with {self.config.n_simulations} iterations")
        start_time = time.time()
        
        self.results = []
        
        # Run simulations with progress bar
        for i in tqdm(range(self.config.n_simulations), desc="Running simulations"):
            result = self.run_single_iteration(i, data_generator, estimator, **kwargs)
            self.results.append(result)
            
            # Save intermediate results if requested
            if self.config.save_intermediate and (i + 1) % 100 == 0:
                self._save_intermediate_results(i + 1)
        
        elapsed_time = time.time() - start_time
        logger.info(f"Simulation completed in {elapsed_time:.2f} seconds")
        
        # Convert to DataFrame
        results_df = self._process_results()
        
        return results_df
    
    def _process_results(self) -> pd.DataFrame:
        """Process raw results into a structured DataFrame"""
        processed_results = []
        
        for result in self.results:
            if result.get('converged', False):
                row = {'iteration': result['iteration']}
                
                # Flatten estimates
                if 'estimates' in result:
                    for param, value in result['estimates'].items():
                        row[f'est_{param}'] = value
                
                # Flatten standard errors
                if 'standard_errors' in result:
                    for param, value in result['standard_errors'].items():
                        row[f'se_{param}'] = value
                
                # Flatten fit indices
                if 'fit_indices' in result:
                    for index, value in result['fit_indices'].items():
                        row[f'fit_{index}'] = value
                
                processed_results.append(row)
        
        return pd.DataFrame(processed_results)
    
    def compute_summary_statistics(self, results_df: pd.DataFrame) -> Dict:
        """
        Compute summary statistics across all simulation iterations.
        
        Args:
            results_df: DataFrame with simulation results
            
        Returns:
            Dictionary with summary statistics
        """
        summary = {}
        
        # Convergence rate
        summary['convergence_rate'] = len(results_df) / self.config.n_simulations
        summary['n_converged'] = len(results_df)
        summary['n_total'] = self.config.n_simulations
        
        # Parameter estimates statistics
        est_cols = [col for col in results_df.columns if col.startswith('est_')]
        
        for col in est_cols:
            param_name = col.replace('est_', '')
            summary[param_name] = {
                'mean': results_df[col].mean(),
                'median': results_df[col].median(),
                'std': results_df[col].std(),
                'bias': results_df[col].mean() - results_df[col].median(),
                'min': results_df[col].min(),
                'max': results_df[col].max(),
                'q25': results_df[col].quantile(0.25),
                'q75': results_df[col].quantile(0.75)
            }
        
        self.summary_stats = summary
        return summary
    
    def _save_intermediate_results(self, iteration: int):
        """Save intermediate results to disk"""
        df = pd.DataFrame(self.results)
        filename = f"results/intermediate_results_{iteration}.csv"
        df.to_csv(filename, index=False)
        logger.info(f"Saved intermediate results to {filename}")
    
    def save_results(self, results_df: pd.DataFrame, filename: str = "results/monte_carlo_results.csv"):
        """
        Save simulation results to CSV file.
        
        Args:
            results_df: DataFrame with simulation results
            filename: Output filename
        """
        results_df.to_csv(filename, index=False)
        logger.info(f"Results saved to {filename}")
    
    def save_summary(self, summary: Dict, filename: str = "results/summary_statistics.json"):
        """
        Save summary statistics to JSON file.
        
        Args:
            summary: Dictionary with summary statistics
            filename: Output filename
        """
        import json
        
        # Convert numpy types to Python types for JSON serialization
        def convert_to_serializable(obj):
            if isinstance(obj, (np.integer, np.floating)):
                return float(obj)
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            elif isinstance(obj, dict):
                return {k: convert_to_serializable(v) for k, v in obj.items()}
            return obj
        
        serializable_summary = convert_to_serializable(summary)
        
        with open(filename, 'w') as f:
            json.dump(serializable_summary, f, indent=2)
        
        logger.info(f"Summary statistics saved to {filename}")


def example_data_generator(sample_size: int, **params) -> np.ndarray:
    """
    Example data generator function for demonstration.
    
    Args:
        sample_size: Number of observations to generate
        **params: Additional parameters
        
    Returns:
        Generated data as numpy array
    """
    n_vars = params.get('n_variables', 3)
    correlation = params.get('correlation', 0.5)
    
    # Create correlation matrix
    corr_matrix = np.full((n_vars, n_vars), correlation)
    np.fill_diagonal(corr_matrix, 1.0)
    
    # Generate data
    data = np.random.multivariate_normal(
        mean=np.zeros(n_vars),
        cov=corr_matrix,
        size=sample_size
    )
    
    return data


def example_estimator(data: np.ndarray, **params) -> Dict:
    """
    Example estimator function for demonstration.
    
    Args:
        data: Input data
        **params: Additional parameters
        
    Returns:
        Dictionary with estimation results
    """
    # Simple correlation-based estimation
    correlations = np.corrcoef(data.T)
    
    results = {
        'converged': True,
        'parameters': {
            f'corr_{i}_{j}': correlations[i, j]
            for i in range(correlations.shape[0])
            for j in range(i+1, correlations.shape[1])
        },
        'standard_errors': {
            f'corr_{i}_{j}': 1.0 / np.sqrt(data.shape[0])
            for i in range(correlations.shape[0])
            for j in range(i+1, correlations.shape[1])
        },
        'fit_indices': {
            'sample_size': data.shape[0],
            'n_variables': data.shape[1]
        }
    }
    
    return results
