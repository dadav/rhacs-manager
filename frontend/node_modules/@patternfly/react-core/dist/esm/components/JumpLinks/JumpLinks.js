import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Children, cloneElement, Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/JumpLinks/jump-links.mjs';
import sidebarStyles from '@patternfly/react-styles/css/components/Sidebar/sidebar.mjs';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import cssToggleDisplayVar from '@patternfly/react-tokens/dist/esm/c_jump_links__toggle_Display';
import { Button } from '../Button';
import { JumpLinksItem } from './JumpLinksItem';
import { JumpLinksList } from './JumpLinksList';
import { canUseDOM, formatBreakpointMods, getUniqueId } from '../../helpers/util';
// Recursively find JumpLinkItems and return an array of all their scrollNodes
const getScrollItems = (children, res) => {
    Children.forEach(children, (child) => {
        if (canUseDOM && document.getElementById && document.querySelector && child.type === JumpLinksItem) {
            const scrollNode = child.props.node || child.props.href;
            if (typeof scrollNode === 'string') {
                if (scrollNode.startsWith('#')) {
                    // Allow spaces and other special characters as `id`s to be nicer to consumers
                    // https://stackoverflow.com/questions/70579/what-are-valid-values-for-the-id-attribute-in-html
                    res.push(document.getElementById(scrollNode.substr(1)));
                }
                else {
                    res.push(document.querySelector(scrollNode));
                }
            }
            else if (scrollNode instanceof HTMLElement) {
                res.push(scrollNode);
            }
        }
        if ([Fragment, JumpLinksList, JumpLinksItem].includes(child.type)) {
            getScrollItems(child.props.children, res);
        }
    });
    return res;
};
function isResponsive(jumpLinks) {
    // https://github.com/patternfly/patternfly/blob/main/src/patternfly/components/JumpLinks/jump-links.scss#L103
    return jumpLinks && getComputedStyle(jumpLinks).getPropertyValue(cssToggleDisplayVar.name).includes('block');
}
export const JumpLinks = (_a) => {
    var { isCentered, isVertical, children, label, 'aria-label': ariaLabel = typeof label === 'string' ? label : null, scrollableRef, scrollableSelector, activeIndex: activeIndexProp = 0, offset = 0, expandable, isExpanded: isExpandedProp = false, alwaysShowLabel = true, toggleAriaLabel = 'Toggle jump links', className, shouldReplaceNavHistory = false, labelId } = _a, props = __rest(_a, ["isCentered", "isVertical", "children", "label", 'aria-label', "scrollableRef", "scrollableSelector", "activeIndex", "offset", "expandable", "isExpanded", "alwaysShowLabel", "toggleAriaLabel", "className", "shouldReplaceNavHistory", "labelId"]);
    const hasScrollSpy = Boolean(scrollableRef || scrollableSelector);
    const [scrollItems, setScrollItems] = useState(hasScrollSpy ? getScrollItems(children, []) : []);
    const [activeIndex, setActiveIndex] = useState(activeIndexProp);
    const [isExpanded, setIsExpanded] = useState(isExpandedProp);
    // Boolean to disable scroll listener from overriding active state of clicked jumplink
    const isLinkClicked = useRef(false);
    const navRef = useRef(undefined);
    let scrollableElement;
    if (!label && !ariaLabel) {
        // eslint-disable-next-line no-console
        console.warn('JumpLinks: for accessibility reasons, an aria-label should be specified if no label is provided');
    }
    if (!label && !toggleAriaLabel && expandable) {
        // eslint-disable-next-line no-console
        console.warn('JumpLinks: for accessibility reasons, a toggleAriaLabel should be specified if no label is provided');
    }
    const getScrollableElement = () => {
        if (scrollableRef) {
            if (scrollableRef instanceof HTMLElement) {
                return scrollableRef;
            }
            else if (typeof scrollableRef === 'function') {
                return scrollableRef();
            }
            return scrollableRef.current;
        }
        else if (scrollableSelector) {
            return document.querySelector(scrollableSelector);
        }
    };
    const scrollSpy = useCallback(() => {
        if (!canUseDOM || !hasScrollSpy || !(scrollableElement instanceof HTMLElement)) {
            return;
        }
        if (isLinkClicked.current) {
            isLinkClicked.current = false;
            return;
        }
        const scrollPosition = Math.ceil(scrollableElement.scrollTop + offset);
        window.requestAnimationFrame(() => {
            let newScrollItems = scrollItems;
            // Items might have rendered after this component or offsetTop values may need
            // to be updated. Do a quick refresh.
            const requiresRefresh = newScrollItems.every((e) => !(e === null || e === void 0 ? void 0 : e.offsetTop)) || !newScrollItems[0] || newScrollItems.includes(null);
            if (requiresRefresh) {
                newScrollItems = getScrollItems(children, []);
                setScrollItems(newScrollItems);
            }
            const scrollElements = newScrollItems
                .map((e, index) => ({
                y: e ? e.offsetTop : null,
                index
            }))
                .filter(({ y }) => y !== null)
                .sort((e1, e2) => e2.y - e1.y);
            for (const { y, index } of scrollElements) {
                if (scrollPosition >= y) {
                    return setActiveIndex(index);
                }
            }
        });
    }, [scrollItems, hasScrollSpy, scrollableElement, offset]);
    useEffect(() => {
        scrollableElement = getScrollableElement();
        if (!(scrollableElement instanceof HTMLElement)) {
            return;
        }
        scrollableElement.addEventListener('scroll', scrollSpy);
        return () => scrollableElement.removeEventListener('scroll', scrollSpy);
    }, [scrollableElement, scrollSpy, getScrollableElement]);
    useEffect(() => {
        scrollSpy();
    }, []);
    let jumpLinkIndex = 0;
    const cloneChildren = (children) => !hasScrollSpy
        ? children
        : Children.map(children, (child) => {
            if (child.type === JumpLinksItem) {
                const { onClick: onClickProp, isActive: isActiveProp } = child.props;
                const itemIndex = jumpLinkIndex++;
                const scrollItem = scrollItems[itemIndex];
                return cloneElement(child, {
                    onClick(ev) {
                        isLinkClicked.current = true;
                        // Items might have rendered after this component. Do a quick refresh.
                        let newScrollItems;
                        if (!scrollItem) {
                            newScrollItems = getScrollItems(children, []);
                            setScrollItems(newScrollItems);
                        }
                        const newScrollItem = scrollItem || newScrollItems[itemIndex];
                        if (newScrollItem) {
                            // we have to support scrolling to an offset due to sticky sidebar
                            const scrollableElement = getScrollableElement();
                            if (scrollableElement instanceof HTMLElement) {
                                if (isResponsive(navRef.current)) {
                                    // Remove class immediately so we can get collapsed height
                                    if (navRef.current) {
                                        navRef.current.classList.remove(styles.modifiers.expanded);
                                    }
                                    let stickyParent = navRef.current && navRef.current.parentElement;
                                    while (stickyParent && !stickyParent.classList.contains(sidebarStyles.modifiers.sticky)) {
                                        stickyParent = stickyParent.parentElement;
                                    }
                                    setIsExpanded(false);
                                    if (stickyParent) {
                                        offset += stickyParent.scrollHeight;
                                    }
                                }
                                scrollableElement.scrollTo(0, newScrollItem.offsetTop - offset);
                            }
                            newScrollItem.focus();
                            if (shouldReplaceNavHistory) {
                                window.history.replaceState('', '', ev.currentTarget.href);
                            }
                            else {
                                window.history.pushState('', '', ev.currentTarget.href);
                            }
                            ev.preventDefault();
                            setActiveIndex(itemIndex);
                        }
                        if (onClickProp) {
                            onClickProp(ev);
                        }
                    },
                    isActive: isActiveProp || activeIndex === itemIndex,
                    children: cloneChildren(child.props.children)
                });
            }
            else if (child.type === Fragment) {
                return cloneChildren(child.props.children);
            }
            else if (child.type === JumpLinksList) {
                return cloneElement(child, { children: cloneChildren(child.props.children) });
            }
            return child;
        });
    const id = labelId !== null && labelId !== void 0 ? labelId : getUniqueId();
    const hasAriaLabelledBy = expandable || (label && alwaysShowLabel);
    const computedAriaLabel = hasAriaLabelledBy ? null : ariaLabel;
    const computedAriaLabelledBy = hasAriaLabelledBy ? id : null;
    return (_jsx("nav", Object.assign({ className: css(styles.jumpLinks, isCentered && styles.modifiers.center, isVertical && styles.modifiers.vertical, formatBreakpointMods(expandable, styles), isExpanded && styles.modifiers.expanded, className), "aria-label": computedAriaLabel, ref: navRef, "aria-labelledby": computedAriaLabelledBy }, props, { children: _jsxs("div", { className: styles.jumpLinksMain, children: [_jsxs("div", { className: css(`${styles.jumpLinks}__header`), children: [expandable && (_jsx("div", { className: styles.jumpLinksToggle, children: _jsx(Button, { variant: "plain", onClick: () => setIsExpanded(!isExpanded), "aria-label": label ? null : toggleAriaLabel, "aria-expanded": isExpanded, icon: _jsx("span", { className: styles.jumpLinksToggleIcon, children: _jsx(AngleRightIcon, {}) }), id: id, children: label && label }) })), label && alwaysShowLabel && !expandable && (_jsx("div", { className: css(styles.jumpLinksLabel), id: id, children: label }))] }), _jsx("ul", { "aria-label": computedAriaLabel, "aria-labelledby": computedAriaLabelledBy, className: styles.jumpLinksList, role: "list", children: cloneChildren(children) })] }) })));
};
JumpLinks.displayName = 'JumpLinks';
//# sourceMappingURL=JumpLinks.js.map