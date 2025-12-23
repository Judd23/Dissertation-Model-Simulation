#!/usr/bin/env python3
"""Python Monte Carlo engine demo (separate from the R SEM MC pipeline).

This script runs the *Python* example simulation from `process_sem/`.

Your dissertation Monte Carlo SEM study entrypoints live under:
- `r/mc/` (runs simulations)
- `r/summaries/` (turn outputs into tables)
- `r/plots/` (plots only)

This script is kept as a small demo/test harness for the Python engine.
"""

import pandas as pd
from process_sem.monte_carlo import (
    MonteCarloSimulator,
    SimulationConfig,
    example_data_generator,
    example_estimator
)
from process_sem.utils import (
    create_summary_table,
    plot_parameter_distributions,
    plot_convergence_over_iterations,
    generate_correlation_matrix
)
import yaml
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def load_config(config_path: str = "config/simulation_config.yaml"):
    """Load configuration from YAML file"""
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        return config
    except FileNotFoundError:
        logger.warning(f"Config file not found at {config_path}. Using defaults.")
        return {}


def main():
    """Main execution function"""
    
    # Load configuration
    config_dict = load_config()

    # Create simulation configuration
    sim_config = SimulationConfig(
        n_simulations=config_dict.get('n_simulations', 1000),
        sample_size=config_dict.get('sample_size', 200),
        random_seed=config_dict.get('random_seed', 42),
        parallel=config_dict.get('parallel', False),
        save_intermediate=config_dict.get('save_intermediate', False)
    )
    
    logger.info("="*60)
    logger.info("Monte Carlo Simulation Study")
    logger.info("="*60)
    logger.info(f"Number of simulations: {sim_config.n_simulations}")
    logger.info(f"Sample size: {sim_config.sample_size}")
    logger.info(f"Random seed: {sim_config.random_seed}")
    logger.info("="*60)
    
    # Define data generation parameters
    n_variables = config_dict.get('n_variables', 3)
    base_correlation = config_dict.get('base_correlation', 0.5)
    
    correlation_matrix = generate_correlation_matrix(n_variables, base_correlation)
    
    logger.info(f"\nTrue Correlation Matrix:\n{correlation_matrix}")
    
    # Create simulator
    simulator = MonteCarloSimulator(sim_config)
    
    # Run simulation
    results_df = simulator.run(
        data_generator=example_data_generator,
        estimator=example_estimator,
        n_variables=n_variables,
        correlation=base_correlation
    )
    
    logger.info(f"\nSimulation completed!")
    logger.info(f"Number of converged iterations: {len(results_df)}")
    logger.info(f"Convergence rate: {len(results_df)/sim_config.n_simulations*100:.2f}%")
    
    # Compute summary statistics
    summary = simulator.compute_summary_statistics(results_df)
    
    logger.info("\n" + "="*60)
    logger.info("Summary Statistics")
    logger.info("="*60)
    logger.info(f"Convergence rate: {summary['convergence_rate']*100:.2f}%")
    
    # Create detailed summary table
    true_values = {}
    for i in range(n_variables):
        for j in range(i+1, n_variables):
            param_name = f'corr_{i}_{j}'
            true_values[param_name] = correlation_matrix[i, j]
    
    summary_table = create_summary_table(
        results_df,
        true_values=true_values,
        confidence_level=config_dict.get('confidence_level', 0.95)
    )
    
    print("\n" + "="*60)
    print("Parameter Estimates Summary")
    print("="*60)
    print(summary_table.to_string(index=False))
    
    # Save results
    results_file = config_dict.get('results_file', 'results/monte_carlo_results.csv')
    summary_file = config_dict.get('summary_file', 'results/summary_statistics.json')
    
    simulator.save_results(results_df, results_file)
    simulator.save_summary(summary, summary_file)
    
    # Save summary table
    summary_table.to_csv('results/summary_table.csv', index=False)
    logger.info("Summary table saved to results/summary_table.csv")
    
    # Generate plots
    logger.info("\nGenerating plots...")
    
    try:
        plot_parameter_distributions(
            results_df,
            true_values=true_values,
            save_path='results/plots/parameter_distributions.png'
        )
        
        # Plot convergence for first parameter
        first_param = list(true_values.keys())[0]
        plot_convergence_over_iterations(
            results_df,
            param_name=first_param,
            true_value=true_values[first_param],
            save_path=f'results/plots/convergence_{first_param}.png'
        )
        
        logger.info("Plots saved to results/plots/")
        
    except Exception as e:
        logger.warning(f"Could not generate plots: {str(e)}")
        logger.warning("This is likely due to missing display. Plots will be skipped.")
    
    logger.info("\n" + "="*60)
    logger.info("Simulation study completed successfully!")
    logger.info("="*60)


if __name__ == "__main__":
    main()
