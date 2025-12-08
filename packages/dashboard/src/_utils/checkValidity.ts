export const checkSlug = (value : string)=>{
    if(!(/^[A-Za-z0-9-]+$/).test(value)){
            return false;
        }
    return true;
}
