import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Progress/progress.mjs';
import { css } from '@patternfly/react-styles';
export const ProgressBar = (_a) => {
    var { progressBarAriaProps, className = '', children = null, value } = _a, props = __rest(_a, ["progressBarAriaProps", "className", "children", "value"]);
    return (_jsx("div", Object.assign({ role: "progressbar" }, props, { className: css(styles.progressBar, className) }, progressBarAriaProps, { children: _jsx("div", { className: css(styles.progressIndicator), style: { width: `${value}%` }, children: _jsx("span", { className: css(styles.progressMeasure), children: children }) }) })));
};
ProgressBar.displayName = 'ProgressBar';
//# sourceMappingURL=ProgressBar.js.map