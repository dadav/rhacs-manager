import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component, createRef, Fragment } from 'react';
import styles from '@patternfly/react-styles/css/components/Nav/nav.mjs';
import { css } from '@patternfly/react-styles';
import { Button } from '../Button';
import AngleLeftIcon from '@patternfly/react-icons/dist/esm/icons/angle-left-icon';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import { getLanguageDirection, isElementInView } from '../../helpers/util';
import { NavContext } from './Nav';
import { PageSidebarContext } from '../Page/PageSidebar';
import { getResizeObserver } from '../../helpers/resizeObserver';
class NavList extends Component {
    constructor() {
        super(...arguments);
        this.direction = 'ltr';
        this.state = {
            scrollViewAtStart: false,
            scrollViewAtEnd: false
        };
        this.navList = createRef();
        this.observer = () => { };
        this.handleScrollButtons = () => {
            const container = this.navList.current;
            if (container) {
                // check if it elements are in view
                const scrollViewAtStart = isElementInView(container, container.firstChild, false);
                const scrollViewAtEnd = isElementInView(container, container.lastChild, false);
                this.setState({
                    scrollViewAtStart,
                    scrollViewAtEnd
                });
                this.context.updateIsScrollable(!scrollViewAtStart || !scrollViewAtEnd);
            }
        };
        this.scrollBack = () => {
            // find first Element that is fully in view on the left, then scroll to the element before it
            const container = this.navList.current;
            if (container) {
                const childrenArr = Array.from(container.children);
                let firstElementInView;
                let lastElementOutOfView;
                for (let i = 0; i < childrenArr.length && !firstElementInView; i++) {
                    if (isElementInView(container, childrenArr[i], false)) {
                        firstElementInView = childrenArr[i];
                        lastElementOutOfView = childrenArr[i - 1];
                    }
                }
                if (lastElementOutOfView) {
                    if (this.direction === 'ltr') {
                        // LTR scrolls left to go back
                        container.scrollLeft -= lastElementOutOfView.scrollWidth;
                    }
                    else {
                        // RTL scrolls right to go back
                        container.scrollLeft += lastElementOutOfView.scrollWidth;
                    }
                }
                this.handleScrollButtons();
            }
        };
        this.scrollForward = () => {
            // find last Element that is fully in view on the right, then scroll to the element after it
            const container = this.navList.current;
            if (container) {
                const childrenArr = Array.from(container.children);
                let lastElementInView;
                let firstElementOutOfView;
                for (let i = childrenArr.length - 1; i >= 0 && !lastElementInView; i--) {
                    if (isElementInView(container, childrenArr[i], false)) {
                        lastElementInView = childrenArr[i];
                        firstElementOutOfView = childrenArr[i + 1];
                    }
                }
                if (firstElementOutOfView) {
                    if (this.direction === 'ltr') {
                        // LTR scrolls right to go forward
                        container.scrollLeft += firstElementOutOfView.scrollWidth;
                    }
                    else {
                        // RTL scrolls left to go forward
                        container.scrollLeft -= firstElementOutOfView.scrollWidth;
                    }
                }
                this.handleScrollButtons();
            }
        };
    }
    componentDidMount() {
        this.observer = getResizeObserver(this.navList.current, this.handleScrollButtons, true);
        this.direction = getLanguageDirection(this.navList.current);
        this.handleScrollButtons();
    }
    componentWillUnmount() {
        this.observer();
    }
    componentDidUpdate() {
        this.direction = getLanguageDirection(this.navList.current);
    }
    render() {
        const _a = this.props, { children, className, backScrollAriaLabel, forwardScrollAriaLabel } = _a, props = __rest(_a, ["children", "className", "backScrollAriaLabel", "forwardScrollAriaLabel"]);
        const { scrollViewAtStart, scrollViewAtEnd } = this.state;
        return (_jsx(NavContext.Consumer, { children: ({ isHorizontal }) => (_jsx(PageSidebarContext.Consumer, { children: ({ isSidebarOpen }) => (_jsxs(Fragment, { children: [isHorizontal && (!scrollViewAtStart || !scrollViewAtEnd) && (_jsx("div", { className: css(styles.navScrollButton), children: _jsx(Button, { variant: "plain", "aria-label": backScrollAriaLabel, onClick: this.scrollBack, isDisabled: scrollViewAtStart, tabIndex: isSidebarOpen ? null : -1, icon: _jsx(AngleLeftIcon, {}) }) })), _jsx("ul", Object.assign({ ref: this.navList, className: css(styles.navList, className), onScroll: this.handleScrollButtons, role: "list" }, props, { children: children })), isHorizontal && (!scrollViewAtStart || !scrollViewAtEnd) && (_jsx("div", { className: css(styles.navScrollButton), children: _jsx(Button, { variant: "plain", "aria-label": forwardScrollAriaLabel, onClick: this.scrollForward, isDisabled: scrollViewAtEnd, tabIndex: isSidebarOpen ? null : -1, icon: _jsx(AngleRightIcon, {}) }) }))] })) })) }));
    }
}
NavList.displayName = 'NavList';
NavList.contextType = NavContext;
NavList.defaultProps = {
    backScrollAriaLabel: 'Scroll back',
    forwardScrollAriaLabel: 'Scroll foward'
};
export { NavList };
//# sourceMappingURL=NavList.js.map