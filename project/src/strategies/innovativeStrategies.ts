import { Strategy } from './types';

export const innovativeStrategies: Strategy[] = [
  {
    name: 'Adaptive Market Regime',
    description: 'Dynamically adapts to market volatility regimes using Kalman filters and regime detection. Combines momentum and mean reversion based on current market state.',
    type: 'adaptive',
    parameters: {
      volatilityWindow: {
        type: 'number',
        default: 20,
        min: 10,
        max: 100,
        step: 5,
        description: 'Window for volatility calculation'
      },
      regimeSensitivity: {
        type: 'number',
        default: 0.7,
        min: 0.1,
        max: 1,
        step: 0.1,
        description: 'Sensitivity to regime changes'
      },
      momentumWeight: {
        type: 'number',
        default: 0.6,
        min: 0,
        max: 1,
        step: 0.1,
        description: 'Weight of momentum strategy'
      },
      meanReversionWeight: {
        type: 'number',
        default: 0.4,
        min: 0,
        max: 1,
        step: 0.1,
        description: 'Weight of mean reversion strategy'
      }
    }
  },
  {
    name: 'Order Flow Imbalance',
    description: 'Analyzes real-time order book imbalances and volume profile to detect institutional trading patterns and potential price movements.',
    type: 'orderflow',
    parameters: {
      imbalanceThreshold: {
        type: 'number',
        default: 2.5,
        min: 1,
        max: 5,
        step: 0.1,
        description: 'Order book imbalance threshold'
      },
      volumeProfilePeriod: {
        type: 'number',
        default: 24,
        min: 12,
        max: 48,
        step: 1,
        description: 'Hours for volume profile analysis'
      },
      minOrderSize: {
        type: 'number',
        default: 1000,
        min: 100,
        max: 10000,
        step: 100,
        description: 'Minimum order size to track'
      }
    }
  },
  {
    name: 'Fractal Wave Momentum',
    description: 'Uses fractal mathematics and Elliott Wave principles to identify high-probability trend continuation and reversal points.',
    type: 'fractal',
    parameters: {
      fractalDimension: {
        type: 'number',
        default: 1.5,
        min: 1,
        max: 2,
        step: 0.1,
        description: 'Fractal dimension threshold'
      },
      waveCycles: {
        type: 'number',
        default: 5,
        min: 3,
        max: 8,
        step: 1,
        description: 'Number of wave cycles to analyze'
      },
      momentumFilter: {
        type: 'number',
        default: 0.6,
        min: 0,
        max: 1,
        step: 0.1,
        description: 'Momentum confirmation threshold'
      }
    }
  },
  {
    name: 'Neural Volatility Surface',
    description: 'Combines neural networks with volatility surface modeling to predict price movement probabilities across multiple timeframes.',
    type: 'neural',
    parameters: {
      timeframes: {
        type: 'number',
        default: 3,
        min: 1,
        max: 5,
        step: 1,
        description: 'Number of timeframes to analyze'
      },
      neuralLayers: {
        type: 'number',
        default: 4,
        min: 2,
        max: 8,
        step: 1,
        description: 'Neural network depth'
      },
      predictionHorizon: {
        type: 'number',
        default: 24,
        min: 1,
        max: 72,
        step: 1,
        description: 'Hours to forecast'
      },
      confidenceThreshold: {
        type: 'number',
        default: 0.8,
        min: 0.5,
        max: 0.95,
        step: 0.05,
        description: 'Minimum prediction confidence'
      }
    }
  },
  {
    name: 'Quantum Entropy Flow',
    description: 'Applies quantum mechanics principles to market microstructure, measuring market entropy and information flow to predict trend exhaustion.',
    type: 'quantum',
    parameters: {
      entropyWindow: {
        type: 'number',
        default: 50,
        min: 20,
        max: 200,
        step: 10,
        description: 'Window for entropy calculation'
      },
      informationThreshold: {
        type: 'number',
        default: 0.7,
        min: 0.3,
        max: 0.9,
        step: 0.1,
        description: 'Information flow threshold'
      },
      quantumNoiseFilter: {
        type: 'number',
        default: 0.3,
        min: 0.1,
        max: 0.5,
        step: 0.1,
        description: 'Quantum noise filter strength'
      },
      stateDecayRate: {
        type: 'number',
        default: 0.05,
        min: 0.01,
        max: 0.1,
        step: 0.01,
        description: 'Quantum state decay rate'
      }
    }
  }
];