export interface IResponse< T = unknown> {
    status: boolean,
    message: string,
    data?: T,
}