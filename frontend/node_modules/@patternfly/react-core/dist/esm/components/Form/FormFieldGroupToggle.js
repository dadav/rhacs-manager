import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Form/form.mjs';
import { css } from '@patternfly/react-styles';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import { Button } from '../Button';
export const FormFieldGroupToggle = (_a) => {
    var { className, onToggle, isExpanded, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby, toggleId } = _a, props = __rest(_a, ["className", "onToggle", "isExpanded", 'aria-label', 'aria-labelledby', "toggleId"]);
    return (_jsx("div", Object.assign({ className: css(styles.formFieldGroupToggle, className) }, props, { children: _jsx("div", { className: css(styles.formFieldGroupToggleButton), children: _jsx(Button, { variant: "plain", "aria-label": ariaLabel, onClick: onToggle, "aria-expanded": isExpanded, "aria-labelledby": ariaLabelledby, id: toggleId, icon: _jsx("span", { className: css(styles.formFieldGroupToggleIcon), children: _jsx(AngleRightIcon, {}) }) }) }) })));
};
FormFieldGroupToggle.displayName = 'FormFieldGroupToggle';
//# sourceMappingURL=FormFieldGroupToggle.js.map