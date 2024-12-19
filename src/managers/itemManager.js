export function getItemRate(stage) {
    if (stage <= 1) return 0.01;
    else if (stage === 2) return 0.02;
    else if (stage === 3) return 0.03;
    else if (stage === 4) return 0.04;
    else return 0.05;
}