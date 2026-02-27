import { Component } from 'react';
import { NavContext } from './Nav';
export interface NavListProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLUListElement>, HTMLUListElement> {
    /** Children nodes */
    children?: React.ReactNode;
    /** Additional classes added to the list */
    className?: string;
    /** Aria-label for the back scroll button */
    backScrollAriaLabel?: string;
    /** Aria-label for the forward scroll button */
    forwardScrollAriaLabel?: string;
}
declare class NavList extends Component<NavListProps> {
    static displayName: string;
    static contextType: import("react").Context<import("./Nav").NavContextProps>;
    context: React.ContextType<typeof NavContext>;
    static defaultProps: NavListProps;
    private direction;
    state: {
        scrollViewAtStart: boolean;
        scrollViewAtEnd: boolean;
    };
    navList: import("react").RefObject<HTMLUListElement>;
    observer: any;
    handleScrollButtons: () => void;
    scrollBack: () => void;
    scrollForward: () => void;
    componentDidMount(): void;
    componentWillUnmount(): void;
    componentDidUpdate(): void;
    render(): import("react/jsx-runtime").JSX.Element;
}
export { NavList };
//# sourceMappingURL=NavList.d.ts.map