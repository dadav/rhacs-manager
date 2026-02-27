import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Panel/panel.mjs';
import { css } from '@patternfly/react-styles';
export const PanelHeader = (_a) => {
    var { className, children } = _a, props = __rest(_a, ["className", "children"]);
    return (_jsx("div", Object.assign({ className: css(styles.panelHeader, className) }, props, { children: children })));
};
PanelHeader.displayName = 'PanelHeader';
//# sourceMappingURL=PanelHeader.js.map