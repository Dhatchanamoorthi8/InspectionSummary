import { Alert as ChakraAlert } from "@chakra-ui/react"
import * as React from "react"

export interface AlertProps extends Omit<ChakraAlert.RootProps, "title"> {
  startElement?: React.ReactNode
  endElement?: React.ReactNode
  title?: React.ReactNode
  icon?: React.ReactElement
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  function Alert(props, ref) {
    const { title, children, icon, startElement, endElement, ...rest } = props
    return (
      <ChakraAlert.Root ref={ref} {...rest}>
        {startElement || (icon ? <ChakraAlert.Indicator>{icon}</ChakraAlert.Indicator> : null)}
        {title ? (
          <ChakraAlert.Content>
            <ChakraAlert.Title>{title}</ChakraAlert.Title>
            {children && <ChakraAlert.Description>{children}</ChakraAlert.Description>}
          </ChakraAlert.Content>
        ) : (
          children
        )}
        {endElement}
      </ChakraAlert.Root>
    )
  },
)

export const AlertIcon: React.FC<any> = (props) => <ChakraAlert.Indicator {...props} />
export const AlertTitle: React.FC<any> = ({ children, ...rest }) => (
  <ChakraAlert.Title {...rest}>{children}</ChakraAlert.Title>
)
export const AlertDescription: React.FC<any> = ({ children, ...rest }) => (
  <ChakraAlert.Description {...rest}>{children}</ChakraAlert.Description>
)
