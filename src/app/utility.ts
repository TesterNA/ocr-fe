interface SimilarityObject {
  similarity: number;
}

interface DataObject {
  aff?: SimilarityObject;
  imp?: SimilarityObject;
}

interface Result<T extends DataObject> {
  object: T;
  index: number;
}

function getObjectWithMaxSimilarity<T extends DataObject>(obj1: T, obj2: T): Result<T> {
  // Get all similarity values from both objects
  const similarities: { obj: T, similarity: number | undefined, index: number }[] = [
    { obj: obj1, similarity: obj1.aff?.similarity, index: 1 },
    { obj: obj1, similarity: obj1.imp?.similarity, index: 1 },
    { obj: obj2, similarity: obj2.aff?.similarity, index: 2 },
    { obj: obj2, similarity: obj2.imp?.similarity, index: 2 },
  ];

  // Find the object with the maximum similarity value
  const maxSimilarityObj = similarities.reduce((max, current) => {
    if (current.similarity === undefined) return max;
    return (max.similarity === undefined || current.similarity > max.similarity) ? current : max;
  }, { obj: obj1, similarity: undefined, index: 1 });

  return { object: maxSimilarityObj.obj, index: maxSimilarityObj.index };
}


export function setResultProperty<T extends DataObject>(obj1: T, obj2: T): Result<T> {
  return getObjectWithMaxSimilarity(obj1, obj2);
}
