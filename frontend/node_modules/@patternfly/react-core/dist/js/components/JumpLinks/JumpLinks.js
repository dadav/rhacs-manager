"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JumpLinks = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const jump_links_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/JumpLinks/jump-links"));
const sidebar_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Sidebar/sidebar"));
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const c_jump_links__toggle_Display_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/c_jump_links__toggle_Display'));
const Button_1 = require("../Button");
const JumpLinksItem_1 = require("./JumpLinksItem");
const JumpLinksList_1 = require("./JumpLinksList");
const util_1 = require("../../helpers/util");
// Recursively find JumpLinkItems and return an array of all their scrollNodes
const getScrollItems = (children, res) => {
    react_1.Children.forEach(children, (child) => {
        if (util_1.canUseDOM && document.getElementById && document.querySelector && child.type === JumpLinksItem_1.JumpLinksItem) {
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
        if ([react_1.Fragment, JumpLinksList_1.JumpLinksList, JumpLinksItem_1.JumpLinksItem].includes(child.type)) {
            getScrollItems(child.props.children, res);
        }
    });
    return res;
};
function isResponsive(jumpLinks) {
    // https://github.com/patternfly/patternfly/blob/main/src/patternfly/components/JumpLinks/jump-links.scss#L103
    return jumpLinks && getComputedStyle(jumpLinks).getPropertyValue(c_jump_links__toggle_Display_1.default.name).includes('block');
}
const JumpLinks = (_a) => {
    var { isCentered, isVertical, children, label, 'aria-label': ariaLabel = typeof label === 'string' ? label : null, scrollableRef, scrollableSelector, activeIndex: activeIndexProp = 0, offset = 0, expandable, isExpanded: isExpandedProp = false, alwaysShowLabel = true, toggleAriaLabel = 'Toggle jump links', className, shouldReplaceNavHistory = false, labelId } = _a, props = tslib_1.__rest(_a, ["isCentered", "isVertical", "children", "label", 'aria-label', "scrollableRef", "scrollableSelector", "activeIndex", "offset", "expandable", "isExpanded", "alwaysShowLabel", "toggleAriaLabel", "className", "shouldReplaceNavHistory", "labelId"]);
    const hasScrollSpy = Boolean(scrollableRef || scrollableSelector);
    const [scrollItems, setScrollItems] = (0, react_1.useState)(hasScrollSpy ? getScrollItems(children, []) : []);
    const [activeIndex, setActiveIndex] = (0, react_1.useState)(activeIndexProp);
    const [isExpanded, setIsExpanded] = (0, react_1.useState)(isExpandedProp);
    // Boolean to disable scroll listener from overriding active state of clicked jumplink
    const isLinkClicked = (0, react_1.useRef)(false);
    const navRef = (0, react_1.useRef)(undefined);
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
    const scrollSpy = (0, react_1.useCallback)(() => {
        if (!util_1.canUseDOM || !hasScrollSpy || !(scrollableElement instanceof HTMLElement)) {
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
    (0, react_1.useEffect)(() => {
        scrollableElement = getScrollableElement();
        if (!(scrollableElement instanceof HTMLElement)) {
            return;
        }
        scrollableElement.addEventListener('scroll', scrollSpy);
        return () => scrollableElement.removeEventListener('scroll', scrollSpy);
    }, [scrollableElement, scrollSpy, getScrollableElement]);
    (0, react_1.useEffect)(() => {
        scrollSpy();
    }, []);
    let jumpLinkIndex = 0;
    const cloneChildren = (children) => !hasScrollSpy
        ? children
        : react_1.Children.map(children, (child) => {
            if (child.type === JumpLinksItem_1.JumpLinksItem) {
                const { onClick: onClickProp, isActive: isActiveProp } = child.props;
                const itemIndex = jumpLinkIndex++;
                const scrollItem = scrollItems[itemIndex];
                return (0, react_1.cloneElement)(child, {
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
                                        navRef.current.classList.remove(jump_links_1.default.modifiers.expanded);
                                    }
                                    let stickyParent = navRef.current && navRef.current.parentElement;
                                    while (stickyParent && !stickyParent.classList.contains(sidebar_1.default.modifiers.sticky)) {
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
            else if (child.type === react_1.Fragment) {
                return cloneChildren(child.props.children);
            }
            else if (child.type === JumpLinksList_1.JumpLinksList) {
                return (0, react_1.cloneElement)(child, { children: cloneChildren(child.props.children) });
            }
            return child;
        });
    const id = labelId !== null && labelId !== void 0 ? labelId : (0, util_1.getUniqueId)();
    const hasAriaLabelledBy = expandable || (label && alwaysShowLabel);
    const computedAriaLabel = hasAriaLabelledBy ? null : ariaLabel;
    const computedAriaLabelledBy = hasAriaLabelledBy ? id : null;
    return ((0, jsx_runtime_1.jsx)("nav", Object.assign({ className: (0, react_styles_1.css)(jump_links_1.default.jumpLinks, isCentered && jump_links_1.default.modifiers.center, isVertical && jump_links_1.default.modifiers.vertical, (0, util_1.formatBreakpointMods)(expandable, jump_links_1.default), isExpanded && jump_links_1.default.modifiers.expanded, className), "aria-label": computedAriaLabel, ref: navRef, "aria-labelledby": computedAriaLabelledBy }, props, { children: (0, jsx_runtime_1.jsxs)("div", { className: jump_links_1.default.jumpLinksMain, children: [(0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(`${jump_links_1.default.jumpLinks}__header`), children: [expandable && ((0, jsx_runtime_1.jsx)("div", { className: jump_links_1.default.jumpLinksToggle, children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "plain", onClick: () => setIsExpanded(!isExpanded), "aria-label": label ? null : toggleAriaLabel, "aria-expanded": isExpanded, icon: (0, jsx_runtime_1.jsx)("span", { className: jump_links_1.default.jumpLinksToggleIcon, children: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, {}) }), id: id, children: label && label }) })), label && alwaysShowLabel && !expandable && ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(jump_links_1.default.jumpLinksLabel), id: id, children: label }))] }), (0, jsx_runtime_1.jsx)("ul", { "aria-label": computedAriaLabel, "aria-labelledby": computedAriaLabelledBy, className: jump_links_1.default.jumpLinksList, role: "list", children: cloneChildren(children) })] }) })));
};
exports.JumpLinks = JumpLinks;
exports.JumpLinks.displayName = 'JumpLinks';
//# sourceMappingURL=JumpLinks.js.map