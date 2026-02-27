import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Icon/icon.mjs';
import { css } from '@patternfly/react-styles';
import { Spinner } from '../Spinner';
export const Icon = (_a) => {
    var { children, className, progressIcon, size, iconSize, progressIconSize, status, isInline = false, isInProgress = false, defaultProgressArialabel = 'Loading...', shouldMirrorRTL = false } = _a, props = __rest(_a, ["children", "className", "progressIcon", "size", "iconSize", "progressIconSize", "status", "isInline", "isInProgress", "defaultProgressArialabel", "shouldMirrorRTL"]);
    const _progressIcon = progressIcon !== null && progressIcon !== void 0 ? progressIcon : _jsx(Spinner, { diameter: "1em", "aria-label": defaultProgressArialabel });
    return (_jsxs("span", Object.assign({ className: css(styles.icon, isInline && styles.modifiers.inline, isInProgress && styles.modifiers.inProgress, styles.modifiers[size], className) }, props, { children: [_jsx("span", { className: css(styles.iconContent, styles.modifiers[iconSize], styles.modifiers[status], shouldMirrorRTL && 'pf-v6-m-mirror-inline-rtl'), children: children }), isInProgress && (_jsx("span", { className: css(styles.iconProgress, styles.modifiers[progressIconSize], className), children: _progressIcon }))] })));
};
Icon.displayName = 'Icon';
//# sourceMappingURL=Icon.js.map