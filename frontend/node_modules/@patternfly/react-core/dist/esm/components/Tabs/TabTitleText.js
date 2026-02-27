import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Tabs/tabs.mjs';
export const TabTitleText = (_a) => {
    var { children, className = '' } = _a, props = __rest(_a, ["children", "className"]);
    return (_jsx("span", Object.assign({ className: css(styles.tabsItemText, className) }, props, { children: children })));
};
TabTitleText.displayName = 'TabTitleText';
//# sourceMappingURL=TabTitleText.js.map