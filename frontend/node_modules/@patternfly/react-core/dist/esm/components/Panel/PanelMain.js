import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Panel/panel.mjs';
import { css } from '@patternfly/react-styles';
import cssMaxHeight from '@patternfly/react-tokens/dist/esm/c_panel__main_MaxHeight';
export const PanelMain = (_a) => {
    var { className, children, maxHeight } = _a, props = __rest(_a, ["className", "children", "maxHeight"]);
    return (_jsx("div", Object.assign({ className: css(styles.panelMain, className), style: { [cssMaxHeight.name]: maxHeight } }, props, { children: children })));
};
PanelMain.displayName = 'PanelMain';
//# sourceMappingURL=PanelMain.js.map