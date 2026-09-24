export const repositoryURL = 'https://github.com/vdmo/pchi';

export const quickStartCommand = `git clone https://github.com/vdmo/pchi.git
cd pchi
cargo run -p primeswarm-pchi`;

export const payloadText = `{
  "type": "state_update",
  "state": {
    "objects": {
      "kraken_tentacle_1": {
        "transform": [1.0, 2.0, 3.0]
      }
    },
    "musical_context": {
      "bpm": 128.0,
      "beat": 16,
      "kick": true
    }
  },
  "pirInvariants": {
    "equilibriumCheck": {
      "residual": 0.000000000001,
      "signSequence": [1, -1, -1, 1]
    },
    "coherenceGap": 0.0,
    "curvatureSignature": "0.0, 0.0, 0.0"
  }
}`;