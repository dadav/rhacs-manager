import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { useContext } from 'react';
import styles from '@patternfly/react-styles/css/components/Masthead/masthead.mjs';
import { css } from '@patternfly/react-styles';
import { formatBreakpointMods } from '../../helpers/util';
import { PageContext } from '../Page/PageContext';
export const Masthead = (_a) => {
    var { children, className, display = {
        md: 'inline'
    }, inset } = _a, props = __rest(_a, ["children", "className", "display", "inset"]);
    const { width, getBreakpoint } = useContext(PageContext);
    return (_jsx("header", Object.assign({ className: css(styles.masthead, formatBreakpointMods(display, styles, 'display-', getBreakpoint(width)), formatBreakpointMods(inset, styles, '', getBreakpoint(width)), className) }, props, { children: children })));
};
Masthead.displayName = 'Masthead';
//# sourceMappingURL=Masthead.js.map