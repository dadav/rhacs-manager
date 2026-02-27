import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Form/form.mjs';
import { css } from '@patternfly/react-styles';
export const ActionGroup = (_a) => {
    var { children = null, className = '' } = _a, props = __rest(_a, ["children", "className"]);
    const customClassName = css(styles.formGroup, styles.modifiers.action, className);
    const formActionsComponent = _jsx("div", { className: css(styles.formActions), children: children });
    return (_jsx("div", Object.assign({}, props, { className: customClassName, children: _jsx("div", { className: css(styles.formGroupControl), children: formActionsComponent }) })));
};
ActionGroup.displayName = 'ActionGroup';
//# sourceMappingURL=ActionGroup.js.map