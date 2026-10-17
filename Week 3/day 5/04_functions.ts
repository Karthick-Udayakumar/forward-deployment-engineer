async function getEncounterbyID(encounter_id : string | number)
{
    const response = await fetch(`http://127.0.0.1:8000/encounters/${encounter_id}`)
    const responseJson =  await response.json()
    return responseJson
}

let encounterId = await getEncounterbyID(2278392)
console.log(encounterId)

export { }
