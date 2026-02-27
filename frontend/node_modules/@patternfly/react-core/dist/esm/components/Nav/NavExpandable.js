import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
import styles from '@patternfly/react-styles/css/components/Nav/nav.mjs';
import { css } from '@patternfly/react-styles';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import { getUniqueId } from '../../helpers/util';
import { NavContext } from './Nav';
import { PageSidebarContext } from '../Page/PageSidebar';
import { getOUIAProps, getDefaultOUIAId } from '../../helpers';
class NavExpandable extends Component {
    constructor() {
        super(...arguments);
        this.id = this.props.id || getUniqueId();
        this.state = {
            expandedState: this.props.isExpanded,
            ouiaStateId: getDefaultOUIAId(NavExpandable.displayName)
        };
        this.onExpand = (event, onToggle) => {
            const { expandedState } = this.state;
            if (this.props.onExpand) {
                this.props.onExpand(event, !expandedState);
            }
            else {
                this.setState((prevState) => ({ expandedState: !prevState.expandedState }));
                const { groupId } = this.props;
                onToggle(event, groupId, !expandedState);
            }
        };
    }
    componentDidMount() {
        this.setState({ expandedState: this.props.isExpanded });
    }
    componentDidUpdate(prevProps) {
        if (this.props.isExpanded !== prevProps.isExpanded) {
            this.setState({ expandedState: this.props.isExpanded });
        }
    }
    render() {
        const _a = this.props, { title, srText, children, className, isActive, ouiaId, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        groupId, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        id, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        isExpanded, buttonProps, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onExpand } = _a, props = __rest(_a, ["title", "srText", "children", "className", "isActive", "ouiaId", "groupId", "id", "isExpanded", "buttonProps", "onExpand"]);
        const { expandedState, ouiaStateId } = this.state;
        return (_jsx(NavContext.Consumer, { children: (context) => (_jsxs("li", Object.assign({ className: css(styles.navItem, expandedState && styles.modifiers.expanded, isActive && styles.modifiers.current, className) }, getOUIAProps(NavExpandable.displayName, ouiaId !== undefined ? ouiaId : ouiaStateId), props, { children: [_jsx(PageSidebarContext.Consumer, { children: ({ isSidebarOpen }) => (_jsxs("button", Object.assign({ className: css(styles.navLink), id: srText ? null : this.id, onClick: (event) => this.onExpand(event, context.onToggle), "aria-expanded": expandedState, tabIndex: isSidebarOpen ? null : -1 }, buttonProps, { children: [typeof title !== 'string' ? _jsx("span", { className: css(`${styles.nav}__link-text`), children: title }) : title, _jsx("span", { className: css(styles.navToggle), children: _jsx("span", { className: css(styles.navToggleIcon), children: _jsx(AngleRightIcon, {}) }) })] }))) }), _jsxs("section", Object.assign({ className: css(styles.navSubnav), "aria-labelledby": this.id, hidden: expandedState ? null : true }, (!expandedState && { inert: '' }), { children: [srText && (_jsx("h2", { className: "pf-v6-screen-reader", id: this.id, children: srText })), _jsx("ul", { className: css(styles.navList), role: "list", children: children })] }))] }))) }));
    }
}
NavExpandable.displayName = 'NavExpandable';
NavExpandable.defaultProps = {
    srText: '',
    isExpanded: false,
    children: '',
    className: '',
    groupId: null,
    isActive: false,
    id: ''
};
export { NavExpandable };
//# sourceMappingURL=NavExpandable.js.map