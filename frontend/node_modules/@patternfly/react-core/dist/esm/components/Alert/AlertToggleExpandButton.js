import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { useContext } from 'react';
import { Button, ButtonVariant } from '../Button';
import { AlertContext } from './AlertContext';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Alert/alert.mjs';
export const AlertToggleExpandButton = (_a) => {
    var { 'aria-label': ariaLabel = '', variantLabel, onToggleExpand, isExpanded = false } = _a, props = __rest(_a, ['aria-label', "variantLabel", "onToggleExpand", "isExpanded"]);
    const { title, variantLabel: alertVariantLabel } = useContext(AlertContext);
    return (_jsx(Button, Object.assign({ variant: ButtonVariant.plain, onClick: onToggleExpand, "aria-expanded": isExpanded, "aria-label": ariaLabel === '' ? `Toggle ${variantLabel || alertVariantLabel} alert: ${title}` : ariaLabel }, props, { icon: _jsx("span", { className: css(styles.alertToggleIcon), children: _jsx(AngleRightIcon, {}) }) })));
};
AlertToggleExpandButton.displayName = 'AlertToggleExpandButton';
//# sourceMappingURL=AlertToggleExpandButton.js.map