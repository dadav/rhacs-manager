import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/FormControl/form-control.mjs';
import { css } from '@patternfly/react-styles';
import CheckCircleIcon from '@patternfly/react-icons/dist/esm/icons/check-circle-icon';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import ExclamationTriangleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-triangle-icon';
export const statusIcons = {
    success: CheckCircleIcon,
    error: ExclamationCircleIcon,
    warning: ExclamationTriangleIcon
};
export const FormControlIcon = (_a) => {
    var { status, customIcon, className } = _a, props = __rest(_a, ["status", "customIcon", "className"]);
    const StatusIcon = status && statusIcons[status];
    return (_jsx("span", Object.assign({ className: css(styles.formControlIcon, status && styles.modifiers.status, className) }, props, { children: customIcon || _jsx(StatusIcon, {}) })));
};
//# sourceMappingURL=FormControlIcon.js.map