/** This Component can be used to wrap a functional component in order to generate a random ID
 * Example of how to use this component
 *
 * const Component = ({id}: {id: string}) => (
 *  <GenerateId>{randomId => (
 *     <div id={id || randomId}>
 *       div with random ID
 *     </div>
 *   )}
 *  </GenerateId>
 *  );
 */
import { Component } from 'react';
export interface GenerateIdProps {
    /** String to prefix the random id with */
    prefix?: string;
    /** Component to be rendered with the generated id */
    children(id: string): React.ReactNode;
    /** Flag to add randomness to the generated id, should be used whenever possible */
    isRandom?: boolean;
}
declare class GenerateId extends Component<GenerateIdProps, {}> {
    static displayName: string;
    static defaultProps: {
        prefix: string;
        isRandom: boolean;
    };
    uniqueElement: string | number;
    id: string;
    render(): import("react").ReactNode;
}
export { GenerateId };
//# sourceMappingURL=GenerateId.d.ts.map